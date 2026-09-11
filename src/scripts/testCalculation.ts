import { prisma } from '../lib/prisma';
import { calculateDispute } from '../services/calculation.service';
import { UserRole, ClaimCategory, EvidenceType } from '@prisma/client';

async function main() {
  console.log('--- Starting Demo Calculation Verification ---');

  // 1. Clean up existing demo users/disputes if any
  await prisma.auditLog.deleteMany({});
  await prisma.evidence.deleteMany({});
  await prisma.claim.deleteMany({});
  await prisma.dispute.deleteMany({});
  await prisma.tenancy.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.user.deleteMany({
    where: { email: { in: ['demo_landlord@gharpay.in', 'demo_tenant@gharpay.in'] } },
  });

  // 2. Create demo users
  const landlord = await prisma.user.create({
    data: {
      email: 'demo_landlord@gharpay.in',
      passwordHash: 'dummy_hash',
      name: 'Ramesh Kumar (Landlord)',
      phone: '+919876543210',
      role: UserRole.LANDLORD,
    },
  });

  const tenant = await prisma.user.create({
    data: {
      email: 'demo_tenant@gharpay.in',
      passwordHash: 'dummy_hash',
      name: 'Suresh Patel (Tenant)',
      phone: '+919876543211',
      role: UserRole.TENANT,
    },
  });

  // 3. Create demo property & tenancy
  const property = await prisma.property.create({
    data: {
      addressLine1: '42 Indiranagar 100ft Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
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

  // 4. Create demo dispute GP-2026-0042
  const dispute = await prisma.dispute.create({
    data: {
      caseNumber: 'GP-2026-0042',
      tenancyId: tenancy.id,
      initiatedBy: landlord.id,
      totalDeposit: 200000,
      claimedDeduction: 42000,
    },
  });

  // 5. Create demo claims
  const paintingClaim = await prisma.claim.create({
    data: {
      disputeId: dispute.id,
      category: ClaimCategory.PAINTING,
      description: 'Wall repainting after tenancy',
      claimedAmount: 18000,
    },
  });

  const fixtureClaim = await prisma.claim.create({
    data: {
      disputeId: dispute.id,
      category: ClaimCategory.FIXTURE,
      description: 'Damaged kitchen fixture replacement',
      claimedAmount: 12000,
    },
  });

  const utilitiesClaim = await prisma.claim.create({
    data: {
      disputeId: dispute.id,
      category: ClaimCategory.UTILITIES,
      description: 'Pending electricity and water bills',
      claimedAmount: 8000,
    },
  });

  const rentClaim = await prisma.claim.create({
    data: {
      disputeId: dispute.id,
      category: ClaimCategory.UNPAID_RENT,
      description: 'Pending last week rent balance',
      claimedAmount: 2000,
    },
  });

  const cleaningClaim = await prisma.claim.create({
    data: {
      disputeId: dispute.id,
      category: ClaimCategory.CLEANING,
      description: 'Deep cleaning charges',
      claimedAmount: 2000,
    },
  });

  // 6. Attach evidence to each claim
  const claimsWithEvidence = [paintingClaim, fixtureClaim, utilitiesClaim, rentClaim, cleaningClaim];
  for (const c of claimsWithEvidence) {
    await prisma.evidence.create({
      data: {
        claimId: c.id,
        uploadedBy: landlord.id,
        type: EvidenceType.RECEIPT,
        fileUrl: `https://gharpay.in/evidence/${c.category.toLowerCase()}_receipt.pdf`,
        description: `Receipt supporting ${c.category} claim`,
      },
    });
  }

  console.log('Demo case GP-2026-0042 created with 5 claims and supporting evidence.');

  // 7. Execute calculation service
  const result = await calculateDispute(dispute.id, landlord.id);

  console.log('\n--- Calculation Service Output ---');
  console.log(JSON.stringify(result, null, 2));

  // 8. Verify DB state after calculation
  const updatedDispute = await prisma.dispute.findUnique({
    where: { id: dispute.id },
    include: { claims: true },
  });

  console.log('\n--- Database Dispute State ---');
  console.log('Case Number:', updatedDispute?.caseNumber);
  console.log('Dispute Status:', updatedDispute?.status);
  console.log('Calculated Deduction:', updatedDispute?.calculatedDeduction?.toString());
  console.log('Settlement Eligible:', updatedDispute?.settlementEligible);

  const auditLogs = await prisma.auditLog.findMany({
    where: { disputeId: dispute.id },
  });
  console.log('\n--- Audit Logs ---');
  console.log(JSON.stringify(auditLogs, null, 2));
}

main()
  .catch((err) => {
    console.error('Error during test execution:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
