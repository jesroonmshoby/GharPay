import bcrypt from 'bcryptjs';
import {
  Prisma,
  DisputeStatus,
  ClaimStatus,
  MediatorRecommendation,
  AuditAction,
  UserRole,
} from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Helper to format Prisma Decimal objects to string or null
 */
const formatDecimal = (val: Prisma.Decimal | null | undefined): string | null => {
  if (val === null || val === undefined) return null;
  return val.toFixed(2);
};

export interface MediatorCaseSummary {
  disputeId: string;
  caseNumber: string;
  status: DisputeStatus;
  property: {
    addressLine1: string;
    city: string;
    state: string;
  };
  landlordName: string;
  tenantName: string;
  mediatorName: string | null;
  calculatedDeduction: string | null;
  tenantOffer: string | null;
  landlordOffer: string | null;
  currentRound: number;
  settlementEligible: boolean;
  mediatorRecommendation: MediatorRecommendation | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lists cases eligible for mediator view (status MEDIATOR_REVIEW or SETTLEMENT_PENDING)
 */
export const listMediatorCases = async (): Promise<MediatorCaseSummary[]> => {
  const disputes = await prisma.dispute.findMany({
    where: {
      status: {
        in: [DisputeStatus.MEDIATOR_REVIEW, DisputeStatus.SETTLEMENT_PENDING],
      },
    },
    include: {
      tenancy: {
        include: {
          property: true,
          landlord: { select: { name: true } },
          tenant: { select: { name: true } },
        },
      },
      mediator: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return disputes.map((d) => ({
    disputeId: d.id,
    caseNumber: d.caseNumber,
    status: d.status,
    property: {
      addressLine1: d.tenancy.property.addressLine1,
      city: d.tenancy.property.city,
      state: d.tenancy.property.state,
    },
    landlordName: d.tenancy.landlord.name,
    tenantName: d.tenancy.tenant.name,
    mediatorName: d.mediator ? d.mediator.name : null,
    calculatedDeduction: formatDecimal(d.calculatedDeduction),
    tenantOffer: formatDecimal(d.tenantOffer),
    landlordOffer: formatDecimal(d.landlordOffer),
    currentRound: d.currentRound,
    settlementEligible: d.settlementEligible,
    mediatorRecommendation: d.mediatorRecommendation,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));
};

/**
 * Lists cases assigned to a specific mediator
 */
export const listMyMediatorCases = async (
  mediatorId: string
): Promise<MediatorCaseSummary[]> => {
  const disputes = await prisma.dispute.findMany({
    where: {
      mediatorId,
    },
    include: {
      tenancy: {
        include: {
          property: true,
          landlord: { select: { name: true } },
          tenant: { select: { name: true } },
        },
      },
      mediator: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return disputes.map((d) => ({
    disputeId: d.id,
    caseNumber: d.caseNumber,
    status: d.status,
    property: {
      addressLine1: d.tenancy.property.addressLine1,
      city: d.tenancy.property.city,
      state: d.tenancy.property.state,
    },
    landlordName: d.tenancy.landlord.name,
    tenantName: d.tenancy.tenant.name,
    mediatorName: d.mediator ? d.mediator.name : null,
    calculatedDeduction: formatDecimal(d.calculatedDeduction),
    tenantOffer: formatDecimal(d.tenantOffer),
    landlordOffer: formatDecimal(d.landlordOffer),
    currentRound: d.currentRound,
    settlementEligible: d.settlementEligible,
    mediatorRecommendation: d.mediatorRecommendation,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));
};

/**
 * Fetches comprehensive case details for a mediator
 */
export const getMediatorCaseDetails = async (disputeId: string) => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      tenancy: {
        include: {
          property: true,
          landlord: { select: { id: true, name: true, email: true } },
          tenant: { select: { id: true, name: true, email: true } },
        },
      },
      mediator: { select: { id: true, name: true, email: true } },
      claims: {
        include: {
          evidence: {
            include: {
              uploader: { select: { id: true, name: true, role: true } },
            },
          },
          tenantComments: {
            include: {
              creator: { select: { id: true, name: true } },
              attachments: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      offers: {
        include: {
          creator: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      auditLogs: {
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
        orderBy: { timestamp: 'desc' },
      },
    },
  });

  if (!dispute) {
    const err = new Error('Dispute not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  return {
    dispute: {
      id: dispute.id,
      caseNumber: dispute.caseNumber,
      status: dispute.status,
      totalDeposit: formatDecimal(dispute.totalDeposit)!,
      claimedDeduction: formatDecimal(dispute.claimedDeduction)!,
      calculatedDeduction: formatDecimal(dispute.calculatedDeduction),
      tenantOffer: formatDecimal(dispute.tenantOffer),
      landlordOffer: formatDecimal(dispute.landlordOffer),
      currentRound: dispute.currentRound,
      settlementEligible: dispute.settlementEligible,
      mediatorRecommendation: dispute.mediatorRecommendation,
      createdAt: dispute.createdAt.toISOString(),
      updatedAt: dispute.updatedAt.toISOString(),
    },
    mediator: dispute.mediator,
    tenancy: {
      id: dispute.tenancy.id,
      startDate: dispute.tenancy.startDate.toISOString(),
      endDate: dispute.tenancy.endDate ? dispute.tenancy.endDate.toISOString() : null,
      monthlyRent: formatDecimal(dispute.tenancy.monthlyRent)!,
      securityDeposit: formatDecimal(dispute.tenancy.securityDeposit)!,
      property: dispute.tenancy.property,
    },
    landlord: dispute.tenancy.landlord,
    tenant: dispute.tenancy.tenant,
    claims: dispute.claims.map((c) => ({
      id: c.id,
      category: c.category,
      description: c.description,
      claimedAmount: formatDecimal(c.claimedAmount)!,
      approvedAmount: formatDecimal(c.approvedAmount),
      status: c.status,
      calculationExplanation: c.calculationExplanation,
      evidence: c.evidence.map((e) => ({
        id: e.id,
        type: e.type,
        fileUrl: e.fileUrl,
        description: e.description,
        verificationStatus: e.verificationStatus,
        uploadedBy: e.uploader,
      })),
      tenantComments: c.tenantComments ? c.tenantComments.map((tc) => ({
        id: tc.id,
        message: tc.message,
        createdAt: tc.createdAt,
        createdBy: tc.creator ? { id: tc.creator.id, name: tc.creator.name } : null,
        attachments: tc.attachments ? tc.attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          fileType: a.fileType,
          fileUrl: a.fileUrl,
          createdAt: a.createdAt,
        })) : [],
      })) : [],
    })),
    offers: dispute.offers.map((o) => ({
      id: o.id,
      amount: formatDecimal(o.amount)!,
      roundNumber: o.roundNumber,
      message: o.message,
      status: o.status,
      createdBy: o.creator,
      createdAt: o.createdAt.toISOString(),
    })),
    auditHistory: dispute.auditLogs.map((a) => ({
      id: a.id,
      action: a.action,
      metadata: a.metadata,
      timestamp: a.timestamp.toISOString(),
      actor: a.user,
    })),
  };
};

/**
 * Assigns a mediator to a dispute (Admin only)
 */
export const assignMediator = async (
  disputeId: string,
  targetMediatorId: string,
  adminUserId: string
) => {
  const mediatorUser = await prisma.user.findUnique({
    where: { id: targetMediatorId },
  });

  if (!mediatorUser || mediatorUser.role !== UserRole.MEDIATOR) {
    const err = new Error('Specified user is not a valid MEDIATOR');
    (err as any).statusCode = 400;
    (err as any).code = 'INVALID_MEDIATOR_ROLE';
    throw err;
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
  });

  if (!dispute) {
    const err = new Error('Dispute not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  if (
    dispute.status !== DisputeStatus.MEDIATOR_REVIEW &&
    dispute.status !== DisputeStatus.SETTLEMENT_PENDING
  ) {
    const err = new Error(
      `Dispute in status ${dispute.status} cannot be assigned to a mediator`
    );
    (err as any).statusCode = 400;
    (err as any).code = 'INVALID_DISPUTE_STATUS';
    throw err;
  }

  // Idempotent assignment check
  if (dispute.mediatorId === targetMediatorId) {
    return {
      disputeId: dispute.id,
      caseNumber: dispute.caseNumber,
      mediatorId: targetMediatorId,
      mediatorName: mediatorUser.name,
      alreadyAssigned: true,
    };
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        mediatorId: targetMediatorId,
      },
    });

    await tx.auditLog.create({
      data: {
        disputeId,
        userId: adminUserId,
        action: AuditAction.MEDIATOR_ASSIGNED,
        metadata: {
          mediatorId: targetMediatorId,
          mediatorName: mediatorUser.name,
        },
      },
    });

    return {
      disputeId: updated.id,
      caseNumber: updated.caseNumber,
      mediatorId: targetMediatorId,
      mediatorName: mediatorUser.name,
      alreadyAssigned: false,
    };
  });
};

/**
 * Records that the assigned mediator has reviewed the case
 */
export const reviewCaseByMediator = async (
  disputeId: string,
  mediatorId: string
) => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
  });

  if (!dispute) {
    const err = new Error('Dispute not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  if (dispute.mediatorId !== mediatorId) {
    const err = new Error('You are not the assigned mediator for this dispute');
    (err as any).statusCode = 403;
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        disputeId,
        userId: mediatorId,
        action: AuditAction.MEDIATOR_REVIEWED,
        metadata: {
          caseNumber: dispute.caseNumber,
        },
      },
    });

    return {
      success: true,
      disputeId: dispute.id,
      caseNumber: dispute.caseNumber,
      reviewedAt: new Date().toISOString(),
    };
  });
};

/**
 * Records structured recommendation by assigned mediator
 */
export const submitMediatorRecommendation = async (
  disputeId: string,
  mediatorId: string,
  recommendation: MediatorRecommendation,
  note?: string
) => {
  if (!Object.values(MediatorRecommendation).includes(recommendation)) {
    const err = new Error(
      `Recommendation must be one of: ${Object.values(MediatorRecommendation).join(', ')}`
    );
    (err as any).statusCode = 400;
    (err as any).code = 'INVALID_RECOMMENDATION';
    throw err;
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
  });

  if (!dispute) {
    const err = new Error('Dispute not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  if (dispute.mediatorId !== mediatorId) {
    const err = new Error('You are not the assigned mediator for this dispute');
    (err as any).statusCode = 403;
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  let nextStatus: DisputeStatus = dispute.status;

  if (recommendation === MediatorRecommendation.READY_FOR_SETTLEMENT) {
    nextStatus = DisputeStatus.SETTLEMENT_PENDING;
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: nextStatus,
        settlementEligible: true,
        mediatorRecommendation: recommendation,
      },
    });

    if (recommendation === MediatorRecommendation.READY_FOR_SETTLEMENT) {
      const agreedDeduction =
        dispute.tenantOffer && dispute.landlordOffer && dispute.tenantOffer.equals(dispute.landlordOffer)
          ? dispute.tenantOffer
          : dispute.calculatedDeduction || dispute.claimedDeduction;
      const refundAmount = dispute.totalDeposit.sub(agreedDeduction);

      await tx.settlement.upsert({
        where: { disputeId },
        create: {
          disputeId,
          agreedDeduction,
          refundAmount,
          consentTenant: false,
          consentLandlord: false,
        },
        update: {
          agreedDeduction,
          refundAmount,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        disputeId,
        userId: mediatorId,
        action: AuditAction.MEDIATOR_RECOMMENDATION_CREATED,
        metadata: {
          recommendation,
          note: note || null,
          settlementEligible: dispute.settlementEligible,
          newStatus: nextStatus,
        },
      },
    });

    return {
      disputeId: updated.id,
      caseNumber: updated.caseNumber,
      recommendation: updated.mediatorRecommendation,
      status: updated.status,
      note: note || null,
    };
  });
};

/**
 * Gets or seeds the default mediator (Priya Menon)
 */
export const getDefaultMediator = async () => {
  let mediator = await prisma.user.findFirst({
    where: { email: 'priya.mediator@gharpay.in' },
  });

  if (!mediator) {
    mediator = await prisma.user.findFirst({
      where: { role: UserRole.MEDIATOR },
    });
  }

  if (!mediator) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);
    mediator = await prisma.user.create({
      data: {
        name: 'Priya Menon',
        email: 'priya.mediator@gharpay.in',
        phone: '+919876543210',
        passwordHash,
        role: UserRole.MEDIATOR,
      },
    });
  }

  return mediator;
};

/**
 * Mediator reviews an individual claim (Approve / Partial / Reject / Needs Clarification)
 */
export const reviewClaimByMediator = async (
  claimId: string,
  mediatorId: string,
  status: ClaimStatus,
  approvedAmount?: number,
  reviewNote?: string
) => {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { dispute: true },
  });

  if (!claim) {
    const err = new Error('Claim not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  const mediatorUser = await prisma.user.findUnique({
    where: { id: mediatorId },
  });

  if (!mediatorUser || mediatorUser.role !== UserRole.MEDIATOR) {
    const err = new Error('Only an authorized MEDIATOR can review claims');
    (err as any).statusCode = 403;
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  const validStatuses: ClaimStatus[] = [
    ClaimStatus.APPROVED,
    ClaimStatus.PARTIAL,
    ClaimStatus.REJECTED,
    ClaimStatus.NEEDS_CLARIFICATION,
  ];
  if (!validStatuses.includes(status)) {
    const err = new Error(`Invalid claim review status. Must be one of: ${validStatuses.join(', ')}`);
    (err as any).statusCode = 400;
    (err as any).code = 'INVALID_STATUS';
    throw err;
  }

  let finalApprovedDecimal: Prisma.Decimal;

  if (status === ClaimStatus.APPROVED) {
    finalApprovedDecimal = claim.claimedAmount;
  } else if (status === ClaimStatus.REJECTED || status === ClaimStatus.NEEDS_CLARIFICATION) {
    finalApprovedDecimal = new Prisma.Decimal(0);
  } else if (status === ClaimStatus.PARTIAL) {
    if (approvedAmount === undefined || approvedAmount === null) {
      const err = new Error('approvedAmount is required for PARTIAL claim review');
      (err as any).statusCode = 400;
      (err as any).code = 'INVALID_INPUT';
      throw err;
    }
    const dec = new Prisma.Decimal(approvedAmount);
    if (dec.isNegative() || dec.greaterThan(claim.claimedAmount)) {
      const err = new Error('approvedAmount must be between 0 and claimedAmount');
      (err as any).statusCode = 400;
      (err as any).code = 'INVALID_APPROVED_AMOUNT';
      throw err;
    }
    finalApprovedDecimal = dec;
  } else {
    finalApprovedDecimal = new Prisma.Decimal(0);
  }

  return await prisma.$transaction(async (tx) => {
    const updatedClaim = await tx.claim.update({
      where: { id: claimId },
      data: {
        status,
        approvedAmount: finalApprovedDecimal,
        mediatorReviewedBy: mediatorId,
        mediatorReviewedAt: new Date(),
        mediatorReviewNote: reviewNote || null,
        calculationExplanation: reviewNote
          ? `Mediator review (${status}): ${reviewNote}`
          : `Claim reviewed by mediator: ${status}`,
      },
    });

    await tx.auditLog.create({
      data: {
        disputeId: claim.disputeId,
        userId: mediatorId,
        action: AuditAction.MEDIATOR_REVIEWED,
        metadata: {
          claimId,
          category: claim.category,
          status,
          claimedAmount: claim.claimedAmount.toFixed(2),
          approvedAmount: finalApprovedDecimal.toFixed(2),
          reviewNote: reviewNote || null,
        },
      },
    });

    return updatedClaim;
  });
};
