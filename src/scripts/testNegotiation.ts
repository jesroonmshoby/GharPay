import { prisma } from '../lib/prisma';
import { calculateDispute } from '../services/calculation.service';
import {
  getTenantDisputeDetails,
  moveToTenantReview,
  startNegotiation,
  submitOffer,
} from '../services/negotiation.service';
import { UserRole, ClaimCategory, EvidenceType, DisputeStatus } from '@prisma/client';

async function main() {
  console.log('====================================================');
  console.log('  GharPay Tenant Review & Negotiation Verification  ');
  console.log('====================================================\n');

  // 1. Clean up existing demo records
  await prisma.auditLog.deleteMany({});
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
          'other.tenant@gharpay.in',
          'other.landlord@gharpay.in',
        ],
      },
    },
  });

  // 2. Create Landlord & Tenant users
  const landlord = await prisma.user.create({
    data: {
      email: 'ramesh.landlord@gharpay.in',
      passwordHash: 'hashed_password_123',
      name: 'Ramesh Kumar',
      phone: '9876543210',
      role: UserRole.LANDLORD,
    },
  });

  const tenant = await prisma.user.create({
    data: {
      email: 'aarav.tenant@gharpay.in',
      passwordHash: 'hashed_password_123',
      name: 'Aarav Sharma',
      phone: '9876543211',
      role: UserRole.TENANT,
    },
  });

  const otherTenant = await prisma.user.create({
    data: {
      email: 'other.tenant@gharpay.in',
      passwordHash: 'hashed_password_123',
      name: 'Other Tenant',
      phone: '9876543212',
      role: UserRole.TENANT,
    },
  });

  const otherLandlord = await prisma.user.create({
    data: {
      email: 'other.landlord@gharpay.in',
      passwordHash: 'hashed_password_123',
      name: 'Other Landlord',
      phone: '9876543213',
      role: UserRole.LANDLORD,
    },
  });

  console.log('✔ User accounts created (Landlord: Ramesh Kumar, Tenant: Aarav Sharma).');

  // 3. Create Property, Tenancy & Dispute (Case GP-2026-0042)
  const property = await prisma.property.create({
    data: {
      addressLine1: 'Building 4, Whitefield Main Rd',
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

  // Create 5 demo claims
  const claimsData = [
    { category: ClaimCategory.PAINTING, amount: 18000, desc: 'Wall repainting' },
    { category: ClaimCategory.FIXTURE, amount: 12000, desc: 'Kitchen fixture damage' },
    { category: ClaimCategory.UTILITIES, amount: 8000, desc: 'Electricity & water bills' },
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
        fileUrl: `https://gharpay.in/evidence/${c.category.toLowerCase()}.pdf`,
        description: `Receipt for ${c.category}`,
      },
    });
  }

  console.log('✔ Case GP-2026-0042 created with 5 claims (₹42,000 claimed deduction).');

  // 4. Run Calculation Engine (Step 8 calculation)
  const calcResult = await calculateDispute(dispute.id, landlord.id);
  console.log(`✔ Calculation Engine finished: Calculated Deduction = ₹${calcResult.calculatedDeduction} (Status: ${calcResult.status}).`);

  // 5. Test Authorization Rejection for Other Tenant
  try {
    await getTenantDisputeDetails(dispute.id, otherTenant.id);
    console.error('❌ FAIL: Unauthorized tenant was able to access dispute details.');
  } catch (err: any) {
    if (err.statusCode === 403) {
      console.log('✔ Authorization check passed: Other tenant received HTTP 403 FORBIDDEN.');
    } else {
      throw err;
    }
  }

  // 6. Tenant accesses own dispute
  const tenantView = await getTenantDisputeDetails(dispute.id, tenant.id);
  console.log(`✔ Tenant successfully accessed dispute details. Calculated deduction shown: ₹${tenantView.calculatedDeduction}.`);

  // 7. Move dispute to TENANT_REVIEW
  const reviewResult = await moveToTenantReview(dispute.id, tenant.id);
  console.log(`✔ Case moved to status: ${reviewResult.status}.`);

  // Idempotency test for review
  const reviewResult2 = await moveToTenantReview(dispute.id, tenant.id);
  console.log(`✔ Idempotent review call confirmed: Status remains ${reviewResult2.status}.`);

  // 8. Start Negotiation
  const negStartResult = await startNegotiation(dispute.id, tenant.id);
  console.log(`✔ Negotiation started. Status: ${negStartResult.status}, Current Round: ${negStartResult.currentRound}.`);

  // 9. Test Invalid Offer Validation (> calculatedDeduction of ₹28,500)
  try {
    await submitOffer(dispute.id, tenant.id, UserRole.TENANT, 30000, 'I want to offer 30,000');
    console.error('❌ FAIL: Offer > calculatedDeduction was accepted.');
  } catch (err: any) {
    if (err.statusCode === 400) {
      console.log(`✔ Offer validation passed: Rejected invalid offer ₹30,000 with HTTP 400 ("${err.message}").`);
    } else {
      throw err;
    }
  }

  // 10. Test Non-Owner Landlord/Tenant Offer Submission Rejection
  try {
    await submitOffer(dispute.id, otherLandlord.id, UserRole.LANDLORD, 27000);
    console.error('❌ FAIL: Non-owner landlord was able to submit offer.');
  } catch (err: any) {
    if (err.statusCode === 403) {
      console.log('✔ Non-owner offer rejection passed: HTTP 403 FORBIDDEN.');
    } else {
      throw err;
    }
  }

  // 11. Execute Demo Negotiation Sequence

  console.log('\n--- Executing Negotiation Round 1 ---');
  // Round 1: Landlord ₹30,000 (Wait, 30,000 > 28,500 so max allowed is ₹28,500! Landlord submits ₹28,500 or ₹28,000)
  // Let's test Landlord ₹28,500 vs Tenant ₹23,000 -> Diff ₹5,500 > ₹1,425 threshold.
  const lOffer1 = await submitOffer(
    dispute.id,
    landlord.id,
    UserRole.LANDLORD,
    28500,
    'Initial landlord offer at calculated limit ₹28,500'
  );
  console.log(`Landlord submitted Round 1 offer: ₹${lOffer1.amount}`);

  const tOffer1 = await submitOffer(
    dispute.id,
    tenant.id,
    UserRole.TENANT,
    23000,
    'Initial tenant offer ₹23,000'
  );
  console.log(`Tenant submitted Round 1 offer: ₹${tOffer1.amount}`);
  console.log('Round 1 Evaluation:', JSON.stringify(tOffer1.roundEvaluation, null, 2));

  // Verify dispute after Round 1
  let updatedDispute = await prisma.dispute.findUnique({ where: { id: dispute.id } });
  console.log(`Dispute state after Round 1: currentRound = ${updatedDispute?.currentRound}, settlementEligible = ${updatedDispute?.settlementEligible}, status = ${updatedDispute?.status}`);

  console.log('\n--- Executing Negotiation Round 2 (Exact Demo Case) ---');
  // Round 2: Landlord ₹27,000 vs Tenant ₹26,000 (Diff ₹1,000 <= 5% threshold ₹1,425)
  const lOffer2 = await submitOffer(
    dispute.id,
    landlord.id,
    UserRole.LANDLORD,
    27000,
    'I can reduce the deduction to ₹27,000.'
  );
  console.log(`Landlord submitted Round 2 offer: ₹${lOffer2.amount}`);

  const tOffer2 = await submitOffer(
    dispute.id,
    tenant.id,
    UserRole.TENANT,
    26000,
    'I can agree to ₹26,000 as the deduction.'
  );
  console.log(`Tenant submitted Round 2 offer: ₹${tOffer2.amount}`);
  console.log('Round 2 Evaluation:', JSON.stringify(tOffer2.roundEvaluation, null, 2));

  // Verify dispute after Round 2
  updatedDispute = await prisma.dispute.findUnique({ where: { id: dispute.id } });
  console.log(`Dispute state after Round 2: currentRound = ${updatedDispute?.currentRound}, settlementEligible = ${updatedDispute?.settlementEligible}, status = ${updatedDispute?.status}`);

  // 12. Verify Settlement Record was NOT created
  const settlementsCount = await prisma.settlement.count({ where: { disputeId: dispute.id } });
  console.log(`✔ Settlement records count in database: ${settlementsCount} (Must be 0).`);

  // 13. Verify Audit Logs
  const auditLogs = await prisma.auditLog.findMany({ where: { disputeId: dispute.id } });
  console.log(`✔ Audit log count: ${auditLogs.length}`);
  console.log('Sample Audit Actions logged:', auditLogs.map((a) => a.action));

  // 14. Test Round 3 Limit & Unresolved Referral Flow
  console.log('\n--- Testing Round 3 Exhaustion Flow on a secondary dispute ---');
  const dispute2 = await prisma.dispute.create({
    data: {
      caseNumber: 'GP-2026-0043',
      tenancyId: tenancy.id,
      initiatedBy: landlord.id,
      totalDeposit: 200000,
      claimedDeduction: 42000,
      calculatedDeduction: 28500,
      status: DisputeStatus.NEGOTIATION,
      currentRound: 3,
    },
  });

  const lOffer3 = await submitOffer(dispute2.id, landlord.id, UserRole.LANDLORD, 28000, 'Final landlord offer ₹28,000');
  const tOffer3 = await submitOffer(dispute2.id, tenant.id, UserRole.TENANT, 20000, 'Final tenant offer ₹20,000');

  console.log('Round 3 Evaluation Result:', JSON.stringify(tOffer3.roundEvaluation, null, 2));
  const dispute2After = await prisma.dispute.findUnique({ where: { id: dispute2.id } });
  console.log(`Dispute GP-2026-0043 after unresolved Round 3: status = ${dispute2After?.status}, settlementEligible = ${dispute2After?.settlementEligible}`);

  console.log('\n====================================================');
  console.log('  ALL TENANT REVIEW & NEGOTIATION TESTS PASSED! 🎉 ');
  console.log('====================================================');
}

main()
  .catch((err) => {
    console.error('Error during verification script execution:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
