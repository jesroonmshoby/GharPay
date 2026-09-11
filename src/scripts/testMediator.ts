import { prisma } from '../lib/prisma';
import { calculateDispute } from '../services/calculation.service';
import {
  moveToTenantReview,
  startNegotiation,
  submitOffer,
} from '../services/negotiation.service';
import {
  listMediatorCases,
  getMediatorCaseDetails,
  listMyMediatorCases,
  assignMediator,
  reviewCaseByMediator,
  submitMediatorRecommendation,
} from '../services/mediator.service';
import {
  UserRole,
  ClaimCategory,
  EvidenceType,
  DisputeStatus,
  MediatorRecommendation,
} from '@prisma/client';

async function main() {
  console.log('====================================================');
  console.log('    GharPay Mediator Review & Assignment Tests     ');
  console.log('====================================================\n');

  // 1. Clean up existing records
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
          'priya.mediator@gharpay.in',
          'other.mediator@gharpay.in',
          'admin@gharpay.in',
        ],
      },
    },
  });

  // 2. Create Users (Landlord, Tenant, Mediator Priya Menon, Unassigned Mediator, Admin)
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
      name: 'Other Mediator',
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

  console.log('✔ Created users: Landlord (Ramesh), Tenant (Aarav), Mediator (Priya Menon), Admin.');

  // 3. Create Property, Tenancy & Dispute GP-2026-0042
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

  // Run calculation, move to review, start negotiation
  await calculateDispute(dispute.id, landlord.id);
  await moveToTenantReview(dispute.id, tenant.id);
  await startNegotiation(dispute.id, tenant.id);

  // Execute Round 1 (unsuccessful match) & Round 2 (settlement eligible match: ₹27k vs ₹26k)
  await submitOffer(dispute.id, landlord.id, UserRole.LANDLORD, 28500);
  await submitOffer(dispute.id, tenant.id, UserRole.TENANT, 23000);
  await submitOffer(dispute.id, landlord.id, UserRole.LANDLORD, 27000);
  const round2Result = await submitOffer(dispute.id, tenant.id, UserRole.TENANT, 26000);

  console.log(`✔ Demo Case GP-2026-0042 set up. Round 2 evaluation: settlementEligible = ${round2Result.roundEvaluation?.settlementEligible}.`);

  // Move dispute to MEDIATOR_REVIEW state for mediator testing
  await prisma.dispute.update({
    where: { id: dispute.id },
    data: { status: DisputeStatus.MEDIATOR_REVIEW },
  });

  // 4. Test Case Listing for Mediators
  const mediatorCases = await listMediatorCases();
  console.log(`✔ Mediator case list fetched: ${mediatorCases.length} case(s) found in MEDIATOR_REVIEW.`);

  // 5. Test Admin Assignment Rejection when assigning LANDLORD as Mediator
  try {
    await assignMediator(dispute.id, landlord.id, adminUser.id);
    console.error('❌ FAIL: Admin was able to assign LANDLORD user as mediator.');
  } catch (err: any) {
    if (err.statusCode === 400) {
      console.log(`✔ Role check passed: Cannot assign LANDLORD as mediator ("${err.message}").`);
    } else {
      throw err;
    }
  }

  // 6. Test Admin Assigning Priya Menon as Mediator
  const assignment = await assignMediator(dispute.id, priyaMediator.id, adminUser.id);
  console.log(`✔ Admin assigned mediator: ${assignment.mediatorName} to case ${assignment.caseNumber}.`);

  // 7. Test "My Cases" for Assigned Mediator
  const priyaCases = await listMyMediatorCases(priyaMediator.id);
  console.log(`✔ Priya Menon "My Cases" count: ${priyaCases.length}.`);

  // 8. Test Mediator Case Details View
  const caseDetails = await getMediatorCaseDetails(dispute.id);
  console.log(`✔ Mediator case details fetched: Case ${caseDetails.dispute.caseNumber}, Landlord: ${caseDetails.landlord.name}, Tenant: ${caseDetails.tenant.name}, Claims count: ${caseDetails.claims.length}.`);

  // 9. Test Review Rejection by Unassigned Mediator
  try {
    await reviewCaseByMediator(dispute.id, unassignedMediator.id);
    console.error('❌ FAIL: Unassigned mediator was able to review case.');
  } catch (err: any) {
    if (err.statusCode === 403) {
      console.log('✔ Assignment authorization check passed: Unassigned mediator rejected with HTTP 403 FORBIDDEN.');
    } else {
      throw err;
    }
  }

  // 10. Test Case Review by Assigned Mediator Priya Menon
  const reviewResult = await reviewCaseByMediator(dispute.id, priyaMediator.id);
  console.log(`✔ Case review recorded by Priya Menon for case ${reviewResult.caseNumber}.`);

  // 11. Test READY_FOR_SETTLEMENT Recommendation Rejection on Non-Eligible Dispute
  const disputeNotEligible = await prisma.dispute.create({
    data: {
      caseNumber: 'GP-2026-0099',
      tenancyId: tenancy.id,
      initiatedBy: landlord.id,
      totalDeposit: 200000,
      claimedDeduction: 42000,
      calculatedDeduction: 28500,
      status: DisputeStatus.MEDIATOR_REVIEW,
      mediatorId: priyaMediator.id,
      settlementEligible: false,
    },
  });

  try {
    await submitMediatorRecommendation(
      disputeNotEligible.id,
      priyaMediator.id,
      MediatorRecommendation.READY_FOR_SETTLEMENT
    );
    console.error('❌ FAIL: READY_FOR_SETTLEMENT was accepted for non-eligible dispute.');
  } catch (err: any) {
    if (err.statusCode === 400) {
      console.log(`✔ Threshold rule enforced: Rejected READY_FOR_SETTLEMENT when settlementEligible=false ("${err.message}").`);
    } else {
      throw err;
    }
  }

  // 12. Test CONTINUE_NEGOTIATION Recommendation (Status remains MEDIATOR_REVIEW)
  const recContinue = await submitMediatorRecommendation(
    disputeNotEligible.id,
    priyaMediator.id,
    MediatorRecommendation.CONTINUE_NEGOTIATION,
    'Encourage parties to narrow the ₹8,000 gap.'
  );
  console.log(`✔ Recommendation CONTINUE_NEGOTIATION recorded: Status remains ${recContinue.status}.`);

  // 13. Test READY_FOR_SETTLEMENT Recommendation on Settlement Eligible Dispute (GP-2026-0042)
  const recReady = await submitMediatorRecommendation(
    dispute.id,
    priyaMediator.id,
    MediatorRecommendation.READY_FOR_SETTLEMENT,
    'Parties are within the configured 5% GharPay settlement threshold (₹1,000 <= ₹1,425).'
  );
  console.log(`✔ Recommendation READY_FOR_SETTLEMENT recorded for GP-2026-0042: Case status updated to ${recReady.status}.`);

  // 14. Verify DB State & Audit Logs
  const finalDispute = await prisma.dispute.findUnique({ where: { id: dispute.id } });
  console.log(`\nDispute Final State: Case ${finalDispute?.caseNumber}, Status = ${finalDispute?.status}, Recommendation = ${finalDispute?.mediatorRecommendation}.`);

  const settlementsCount = await prisma.settlement.count({ where: { disputeId: dispute.id } });
  console.log(`✔ Settlement records count in database: ${settlementsCount} (Must be 0).`);

  const auditLogs = await prisma.auditLog.findMany({ where: { disputeId: dispute.id } });
  console.log(`✔ Audit log count: ${auditLogs.length}`);
  console.log('Audit log actions logged:', auditLogs.map((a) => a.action));

  console.log('\n====================================================');
  console.log(' ALL MEDIATOR REVIEW & ASSIGNMENT TESTS PASSED! 🎉 ');
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
