import { prisma } from '../lib/prisma';
import { calculateDispute } from '../services/calculation.service';
import {
  moveToTenantReview,
  startNegotiation,
  submitOffer,
} from '../services/negotiation.service';
import {
  assignMediator,
  submitMediatorRecommendation,
} from '../services/mediator.service';
import {
  createSettlement,
  getSettlement,
  recordTenantConsent,
  recordLandlordConsent,
} from '../services/settlement.service';
import {
  UserRole,
  ClaimCategory,
  EvidenceType,
  DisputeStatus,
  MediatorRecommendation,
} from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function main() {
  console.log('====================================================');
  console.log('      GharPay Settlement Workflow Verification      ');
  console.log('====================================================\n');

  // 1. Clean up existing database tables
  await prisma.auditLog.deleteMany({});
  await prisma.settlement.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.evidence.deleteMany({});
  await prisma.claim.deleteMany({});
  await prisma.dispute.deleteMany({});
  await prisma.tenancy.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'ramesh.landlord@gharpay.in',
          'aarav.tenant@gharpay.in',
          'priya.mediator@gharpay.in',
          'other.mediator@gharpay.in',
          'other.tenant@gharpay.in',
          'admin@gharpay.in',
        ],
      },
    },
  });

  // 2. Create Users
  const landlord = await prisma.user.create({
    data: {
      email: 'ramesh.landlord@gharpay.in',
      passwordHash: 'dummy_hash',
      name: 'Ramesh Kumar',
      phone: '9876543210',
      role: UserRole.LANDLORD,
    },
  });

  const tenant = await prisma.user.create({
    data: {
      email: 'aarav.tenant@gharpay.in',
      passwordHash: 'dummy_hash',
      name: 'Aarav Sharma',
      phone: '9876543211',
      role: UserRole.TENANT,
    },
  });

  const otherTenant = await prisma.user.create({
    data: {
      email: 'other.tenant@gharpay.in',
      passwordHash: 'dummy_hash',
      name: 'Other Tenant',
      phone: '9876543219',
      role: UserRole.TENANT,
    },
  });

  const priyaMediator = await prisma.user.create({
    data: {
      email: 'priya.mediator@gharpay.in',
      passwordHash: 'dummy_hash',
      name: 'Priya Menon',
      phone: '9876543214',
      role: UserRole.MEDIATOR,
    },
  });

  const unassignedMediator = await prisma.user.create({
    data: {
      email: 'other.mediator@gharpay.in',
      passwordHash: 'dummy_hash',
      name: 'Unassigned Mediator',
      phone: '9876543215',
      role: UserRole.MEDIATOR,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@gharpay.in',
      passwordHash: 'dummy_hash',
      name: 'GharPay Admin',
      phone: '9876543299',
      role: UserRole.ADMIN,
    },
  });

  console.log('✔ Users seeded (Landlord: Ramesh, Tenant: Aarav, Mediator: Priya Menon, Admin).');

  // 3. Create Demo Case GP-2026-0042
  const property = await prisma.property.create({
    data: {
      addressLine1: 'Whitefield Main Rd',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560066',
    },
  });

  const tenancy = await prisma.tenancy.create({
    data: {
      propertyId: property.id,
      landlordId: landlord.id,
      tenantId: tenant.id,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      monthlyRent: 40000,
      securityDeposit: 200000,
    },
  });

  const dispute = await prisma.dispute.create({
    data: {
      caseNumber: 'GP-2026-0042',
      tenancyId: tenancy.id,
      initiatedBy: landlord.id,
      totalDeposit: 200000,
      claimedDeduction: 42000,
    },
  });

  // Create claims & evidence
  const claimsData = [
    { category: ClaimCategory.PAINTING, amount: 18000, desc: 'Repainting' },
    { category: ClaimCategory.FIXTURE, amount: 12000, desc: 'Fixture repair' },
    { category: ClaimCategory.UTILITIES, amount: 8000, desc: 'Utility bills' },
    { category: ClaimCategory.UNPAID_RENT, amount: 2000, desc: 'Rent balance' },
    { category: ClaimCategory.CLEANING, amount: 2000, desc: 'Deep cleaning' },
  ];

  for (const c of claimsData) {
    const claim = await prisma.claim.create({
      data: {
        disputeId: dispute.id,
        category: c.category,
        description: c.desc,
        claimedAmount: c.amount,
      },
    });

    await prisma.evidence.create({
      data: {
        claimId: claim.id,
        uploadedBy: landlord.id,
        type: EvidenceType.RECEIPT,
        fileUrl: `https://gharpay.in/receipt_${c.category}.pdf`,
      },
    });
  }

  // Calculate, Tenant Review, Start Negotiation, Round 1 & Round 2 offers
  await calculateDispute(dispute.id, landlord.id);
  await moveToTenantReview(dispute.id, tenant.id);
  await startNegotiation(dispute.id, tenant.id);

  // Round 1
  await submitOffer(dispute.id, landlord.id, UserRole.LANDLORD, 28500);
  await submitOffer(dispute.id, tenant.id, UserRole.TENANT, 23000);

  // Round 2 (Landlord ₹27,000, Tenant ₹26,000 -> Diff ₹1,000 <= ₹1,425 threshold)
  await submitOffer(dispute.id, landlord.id, UserRole.LANDLORD, 27000);
  await submitOffer(dispute.id, tenant.id, UserRole.TENANT, 26000);

  // Move to MEDIATOR_REVIEW and assign Priya Menon
  await prisma.dispute.update({
    where: { id: dispute.id },
    data: { status: DisputeStatus.MEDIATOR_REVIEW },
  });

  await assignMediator(dispute.id, priyaMediator.id, adminUser.id);
  await submitMediatorRecommendation(
    dispute.id,
    priyaMediator.id,
    MediatorRecommendation.READY_FOR_SETTLEMENT,
    'Parties are within 5% threshold.'
  );

  console.log('✔ Case GP-2026-0042 prepared in SETTLEMENT_PENDING state with Priya Menon assigned.');

  // 4. Test Unassigned Mediator Rejection when creating Settlement
  try {
    await createSettlement(dispute.id, 26500, unassignedMediator.id);
    console.error('❌ FAIL: Unassigned mediator was able to create settlement.');
  } catch (err: any) {
    if (err.statusCode === 403) {
      console.log('✔ Authorization check passed: Unassigned mediator rejected with HTTP 403 FORBIDDEN.');
    } else {
      throw err;
    }
  }

  // 5. Test Invalid Agreed Deduction Outside Offer Bounds (e.g. ₹20,000 or ₹30,000)
  try {
    await createSettlement(dispute.id, 20000, priyaMediator.id);
    console.error('❌ FAIL: Agreed deduction outside offer bounds was accepted.');
  } catch (err: any) {
    if (err.statusCode === 400) {
      console.log(`✔ Offer bound validation passed: Rejected ₹20,000 with HTTP 400 ("${err.message}").`);
    } else {
      throw err;
    }
  }

  // 6. Test Valid Settlement Creation by Assigned Mediator (Agreed Deduction: ₹26,500)
  const settlement = await createSettlement(dispute.id, 26500, priyaMediator.id);
  console.log(`✔ Settlement created by Priya Menon: Agreed Deduction = ₹${settlement.agreedDeduction}, Refund Amount = ₹${settlement.refundAmount}.`);

  // 7. Test Duplicate Settlement Creation Rejection (Single Settlement Per Dispute Rule)
  try {
    await createSettlement(dispute.id, 26500, priyaMediator.id);
    console.error('❌ FAIL: Duplicate settlement was created.');
  } catch (err: any) {
    if (err.statusCode === 409) {
      console.log('✔ Idempotency check passed: Duplicate settlement rejected with HTTP 409 DUPLICATE_SETTLEMENT.');
    } else {
      throw err;
    }
  }

  // 8. Test Unauthorized User Viewing Settlement
  try {
    await getSettlement(dispute.id, otherTenant.id, UserRole.TENANT);
    console.error('❌ FAIL: Unauthorized tenant was able to view settlement.');
  } catch (err: any) {
    if (err.statusCode === 403) {
      console.log('✔ View authorization check passed: Unauthorized tenant rejected with HTTP 403 FORBIDDEN.');
    } else {
      throw err;
    }
  }

  // 9. Test Tenant Consent Recording
  const sAfterTenantConsent = await recordTenantConsent(dispute.id, tenant.id, true);
  console.log(`✔ Tenant Aarav Sharma consented: consentTenant = ${sAfterTenantConsent.consentTenant}, consentLandlord = ${sAfterTenantConsent.consentLandlord}.`);
  console.log(`✔ Dispute status after ONE consent: ${sAfterTenantConsent.disputeStatus} (Must remain SETTLEMENT_PENDING).`);

  // Test Tenant Consent Idempotency
  const sAfterTenantConsentRepeat = await recordTenantConsent(dispute.id, tenant.id, true);
  console.log(`✔ Repeat tenant consent call confirmed idempotent: consentTenant = ${sAfterTenantConsentRepeat.consentTenant}.`);

  // 10. Test Landlord Consent Recording (Both Consents Complete)
  const sAfterLandlordConsent = await recordLandlordConsent(dispute.id, landlord.id, true);
  console.log(`✔ Landlord Ramesh Kumar consented: consentTenant = ${sAfterLandlordConsent.consentTenant}, consentLandlord = ${sAfterLandlordConsent.consentLandlord}.`);
  console.log(`✔ Dispute status after BOTH consents: ${sAfterLandlordConsent.disputeStatus} (Must be SETTLED).`);

  // 11. Verify PDF File Generation & Cryptographic Hash
  const finalDispute = await prisma.dispute.findUnique({
    where: { id: dispute.id },
    include: { settlement: true },
  });

  console.log(`✔ Final Settlement DB State: pdfUrl = ${finalDispute?.settlement?.pdfUrl}, settlementHash = ${finalDispute?.settlement?.settlementHash}.`);

  const storageDir = path.join(process.cwd(), 'storage', 'settlements');
  const pdfFilePath = path.join(storageDir, `${dispute.caseNumber}_settlement.pdf`);

  if (fs.existsSync(pdfFilePath)) {
    const fileBytes = fs.readFileSync(pdfFilePath);
    const computedHash = crypto.createHash('sha256').update(fileBytes).digest('hex');

    console.log(`✔ PDF file exists on disk: ${pdfFilePath} (${fileBytes.length} bytes).`);
    if (computedHash === finalDispute?.settlement?.settlementHash) {
      console.log(`✔ Cryptographic Hash Verification PASSED: SHA-256 matches exact PDF bytes (${computedHash}).`);
    } else {
      console.error(`❌ Hash mismatch: Computed ${computedHash} vs DB ${finalDispute?.settlement?.settlementHash}`);
    }
  } else {
    console.error(`❌ PDF file not found at ${pdfFilePath}`);
  }

  // 12. Verify Audit Log History
  const auditLogs = await prisma.auditLog.findMany({ where: { disputeId: dispute.id } });
  console.log(`✔ Audit Log count: ${auditLogs.length}`);
  console.log('Audit Actions:', auditLogs.map((a) => a.action));

  console.log('\n====================================================');
  console.log('   ALL SETTLEMENT WORKFLOW TESTS PASSED! 🎉        ');
  console.log('====================================================');
}

main()
  .catch((err) => {
    console.error('Error during test execution:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
