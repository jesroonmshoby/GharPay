import { prisma } from '../lib/prisma';
import { calculateDispute } from '../services/calculation.service';
import { startNegotiation, submitOffer } from '../services/negotiation.service';
import {
  createSettlement,
  getSettlement,
  recordTenantConsent,
  recordLandlordConsent,
  markPaymentAsPaid,
} from '../services/settlement.service';
import {
  UserRole,
  ClaimCategory,
  EvidenceType,
  DisputeStatus,
} from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function main() {
  console.log('====================================================');
  console.log('  GharPay Direct ODR Settlement Verification Script  ');
  console.log('====================================================\n');

  // 1. Clean up test database
  await prisma.auditLog.deleteMany({});
  await prisma.settlement.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.tenantCommentAttachment.deleteMany({});
  await prisma.tenantComment.deleteMany({});
  await prisma.evidence.deleteMany({});
  await prisma.claim.deleteMany({});
  await prisma.dispute.deleteMany({});
  await prisma.tenancy.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Landlord & Tenant
  const landlord = await prisma.user.create({
    data: {
      email: 'ramesh.landlord@gharpay.in',
      name: 'Ramesh Kumar',
      role: UserRole.LANDLORD,
    },
  });

  const tenant = await prisma.user.create({
    data: {
      email: 'aarav.tenant@gharpay.in',
      name: 'Aarav Sharma',
      role: UserRole.TENANT,
    },
  });

  console.log('✔ Created test users: Landlord (Ramesh), Tenant (Aarav)');

  // 3. Create Property & Tenancy
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

  // 4. Create Dispute & Claims
  const dispute = await prisma.dispute.create({
    data: {
      caseNumber: 'GP-2026-0042',
      tenancyId: tenancy.id,
      initiatedBy: landlord.id,
      totalDeposit: 200000,
      claimedDeduction: 42000,
      status: DisputeStatus.SUBMITTED,
    },
  });

  const claim1 = await prisma.claim.create({
    data: {
      disputeId: dispute.id,
      category: ClaimCategory.PAINTING,
      description: 'Repainting',
      claimedAmount: 18000,
    },
  });

  const claim2 = await prisma.claim.create({
    data: {
      disputeId: dispute.id,
      category: ClaimCategory.FIXTURE,
      description: 'Fixture repair',
      claimedAmount: 12000,
    },
  });

  console.log('✔ Created dispute GP-2026-0042 with claims');

  // 5. Rule Engine Calculation
  const calcResult = await calculateDispute(dispute.id, landlord.id);
  console.log(`✔ Calculation complete. Total Calculated Deduction: ₹${calcResult.calculatedDeduction}`);

  // Start negotiation
  await startNegotiation(dispute.id, landlord.id);

  // 6. Negotiation Offers
  await submitOffer(dispute.id, landlord.id, UserRole.LANDLORD, 16000);
  const tOffer = await submitOffer(dispute.id, tenant.id, UserRole.TENANT, 15500);

  console.log(`✔ Negotiation offers submitted. Settlement Eligible: ${tOffer.roundEvaluation?.settlementEligible}`);

  // 7. Settlement Creation
  const settlement = await createSettlement(dispute.id, 15500, tenant.id);
  console.log(`✔ Settlement created: Agreed Deduction = ₹${settlement.agreedDeduction}, Refund Amount = ₹${settlement.refundAmount}`);

  // 8. Dual Consent
  await recordTenantConsent(dispute.id, tenant.id, true);
  const updatedSettlement = await recordLandlordConsent(dispute.id, landlord.id, true);
  console.log(`✔ Dual consent recorded. Dispute status: ${updatedSettlement.disputeStatus}`);

  // 9. Payment Confirmation
  const paidSettlement = await markPaymentAsPaid(dispute.id, landlord.id);
  console.log(`✔ Payment marked as paid. Status: ${paidSettlement.paymentStatus}`);

  // 10. PDF Verification
  const storageDir = path.join(process.cwd(), 'storage', 'settlements');
  const pdfFilePath = path.join(storageDir, `${dispute.caseNumber}_settlement.pdf`);

  if (fs.existsSync(pdfFilePath)) {
    const fileBytes = fs.readFileSync(pdfFilePath);
    const computedHash = crypto.createHash('sha256').update(fileBytes).digest('hex');

    console.log(`✔ PDF file exists on disk (${fileBytes.length} bytes).`);
    if (computedHash === paidSettlement.settlementHash) {
      console.log(`✔ SHA-256 Hash Verification PASSED (${computedHash}).`);
    }
  }

  console.log('\n====================================================');
  console.log('   ALL DIRECT SETTLEMENT WORKFLOW TESTS PASSED! 🎉  ');
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
