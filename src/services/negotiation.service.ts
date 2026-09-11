import {
  Prisma,
  DisputeStatus,
  OfferStatus,
  AuditAction,
  UserRole,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  MAX_NEGOTIATION_ROUNDS,
  SETTLEMENT_THRESHOLD_PERCENT,
} from '../config/negotiationRules';

/**
 * Helper to format Prisma Decimal objects to string or null
 */
const formatDecimal = (val: Prisma.Decimal | null | undefined): string | null => {
  if (val === null || val === undefined) return null;
  return val.toFixed(2);
};

export interface FormattedDispute {
  id: string;
  caseNumber: string;
  status: DisputeStatus;
  totalDeposit: string;
  claimedDeduction: string;
  calculatedDeduction: string | null;
  currentRound: number;
  settlementEligible: boolean;
  tenantOffer: string | null;
  landlordOffer: string | null;
  property: {
    id: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string | null;
  };
  tenancy: {
    id: string;
    startDate: string;
    endDate: string | null;
    monthlyRent: string;
    securityDeposit: string;
    landlord: {
      id: string;
      name: string;
      email: string;
    };
  };
  claims: any[];
  offers: any[];
}

/**
 * Fetches all disputes for an authenticated tenant
 */
export const getTenantDisputes = async (tenantId: string) => {
  const disputes = await prisma.dispute.findMany({
    where: {
      tenancy: {
        tenantId,
      },
    },
    include: {
      tenancy: {
        include: {
          property: true,
          landlord: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      claims: {
        include: {
          evidence: true,
        },
      },
      offers: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return disputes.map((d) => ({
    id: d.id,
    caseNumber: d.caseNumber,
    status: d.status,
    totalDeposit: formatDecimal(d.totalDeposit)!,
    claimedDeduction: formatDecimal(d.claimedDeduction)!,
    calculatedDeduction: formatDecimal(d.calculatedDeduction),
    currentRound: d.currentRound,
    settlementEligible: d.settlementEligible,
    tenantOffer: formatDecimal(d.tenantOffer),
    landlordOffer: formatDecimal(d.landlordOffer),
    property: d.tenancy.property,
    tenancy: {
      id: d.tenancy.id,
      startDate: d.tenancy.startDate.toISOString(),
      endDate: d.tenancy.endDate ? d.tenancy.endDate.toISOString() : null,
      monthlyRent: formatDecimal(d.tenancy.monthlyRent)!,
      securityDeposit: formatDecimal(d.tenancy.securityDeposit)!,
      landlord: d.tenancy.landlord,
    },
    claimsCount: d.claims.length,
    offersCount: d.offers.length,
  }));
};

/**
 * Fetches detailed dispute case for a tenant owner
 */
export const getTenantDisputeDetails = async (
  disputeId: string,
  tenantId: string
): Promise<FormattedDispute> => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      tenancy: {
        include: {
          property: true,
          landlord: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      claims: {
        include: {
          evidence: true,
        },
      },
      offers: {
        include: {
          creator: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!dispute) {
    const err = new Error('Dispute not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  if (dispute.tenancy.tenantId !== tenantId) {
    const err = new Error('You are not authorized to access this dispute');
    (err as any).statusCode = 403;
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  return {
    id: dispute.id,
    caseNumber: dispute.caseNumber,
    status: dispute.status,
    totalDeposit: formatDecimal(dispute.totalDeposit)!,
    claimedDeduction: formatDecimal(dispute.claimedDeduction)!,
    calculatedDeduction: formatDecimal(dispute.calculatedDeduction),
    currentRound: dispute.currentRound,
    settlementEligible: dispute.settlementEligible,
    tenantOffer: formatDecimal(dispute.tenantOffer),
    landlordOffer: formatDecimal(dispute.landlordOffer),
    property: dispute.tenancy.property,
    tenancy: {
      id: dispute.tenancy.id,
      startDate: dispute.tenancy.startDate.toISOString(),
      endDate: dispute.tenancy.endDate ? dispute.tenancy.endDate.toISOString() : null,
      monthlyRent: formatDecimal(dispute.tenancy.monthlyRent)!,
      securityDeposit: formatDecimal(dispute.tenancy.securityDeposit)!,
      landlord: dispute.tenancy.landlord,
    },
    claims: dispute.claims.map((c) => ({
      id: c.id,
      category: c.category,
      description: c.description,
      claimedAmount: formatDecimal(c.claimedAmount),
      approvedAmount: formatDecimal(c.approvedAmount),
      status: c.status,
      explanation: c.calculationExplanation,
      evidence: c.evidence.map((e) => ({
        id: e.id,
        type: e.type,
        fileUrl: e.fileUrl,
        description: e.description,
        verificationStatus: e.verificationStatus,
      })),
    })),
    offers: dispute.offers.map((o) => ({
      id: o.id,
      roundNumber: o.roundNumber,
      amount: formatDecimal(o.amount),
      status: o.status,
      message: o.message,
      createdBy: o.creator,
      createdAt: o.createdAt.toISOString(),
    })),
  };
};

/**
 * Transitions a dispute from CALCULATED to TENANT_REVIEW
 */
export const moveToTenantReview = async (
  disputeId: string,
  tenantId: string
) => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { tenancy: true },
  });

  if (!dispute) {
    const err = new Error('Dispute not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  if (dispute.tenancy.tenantId !== tenantId) {
    const err = new Error('You are not authorized to access this dispute');
    (err as any).statusCode = 403;
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  if (dispute.status === DisputeStatus.TENANT_REVIEW) {
    // Idempotent return
    return dispute;
  }

  if (dispute.status !== DisputeStatus.CALCULATED) {
    const err = new Error(
      `Dispute cannot move to TENANT_REVIEW from status ${dispute.status}`
    );
    (err as any).statusCode = 400;
    (err as any).code = 'INVALID_STATUS';
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.TENANT_REVIEW,
      },
    });

    await tx.auditLog.create({
      data: {
        disputeId,
        userId: tenantId,
        action: AuditAction.CASE_SUBMITTED,
        metadata: {
          reviewAction: 'TENANT_REVIEW_STARTED',
        },
      },
    });

    return updated;
  });
};

/**
 * Transitions a dispute into NEGOTIATION state
 */
export const startNegotiation = async (
  disputeId: string,
  tenantId: string
) => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { tenancy: true },
  });

  if (!dispute) {
    const err = new Error('Dispute not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  if (dispute.tenancy.tenantId !== tenantId) {
    const err = new Error('You are not authorized to access this dispute');
    (err as any).statusCode = 403;
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  if (
    dispute.status !== DisputeStatus.TENANT_REVIEW &&
    dispute.status !== DisputeStatus.NEGOTIATION
  ) {
    const err = new Error(
      `Negotiation cannot start from current status ${dispute.status}`
    );
    (err as any).statusCode = 400;
    (err as any).code = 'INVALID_STATUS';
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    const nextRound = dispute.currentRound === 0 ? 1 : dispute.currentRound;

    const updated = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.NEGOTIATION,
        currentRound: nextRound,
      },
    });

    await tx.auditLog.create({
      data: {
        disputeId,
        userId: tenantId,
        action: AuditAction.CASE_SUBMITTED,
        metadata: {
          negotiationAction: 'NEGOTIATION_STARTED',
          currentRound: nextRound,
        },
      },
    });

    return updated;
  });
};

/**
 * Shared service for submitting an offer by Tenant or Landlord
 */
export const submitOffer = async (
  disputeId: string,
  userId: string,
  userRole: UserRole,
  amountRaw: number | string | Prisma.Decimal,
  message?: string
) => {
  const offerAmount = new Prisma.Decimal(amountRaw);

  if (offerAmount.isNegative()) {
    const err = new Error('Offer amount cannot be negative');
    (err as any).statusCode = 400;
    (err as any).code = 'INVALID_OFFER_AMOUNT';
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.findUnique({
      where: { id: disputeId },
      include: {
        tenancy: true,
      },
    });

    if (!dispute) {
      const err = new Error('Dispute not found');
      (err as any).statusCode = 404;
      (err as any).code = 'NOT_FOUND';
      throw err;
    }

    // Ownership check
    if (userRole === UserRole.TENANT && dispute.tenancy.tenantId !== userId) {
      const err = new Error('You are not authorized to access this dispute');
      (err as any).statusCode = 403;
      (err as any).code = 'FORBIDDEN';
      throw err;
    }

    if (userRole === UserRole.LANDLORD && dispute.tenancy.landlordId !== userId) {
      const err = new Error('You are not authorized to access this dispute');
      (err as any).statusCode = 403;
      (err as any).code = 'FORBIDDEN';
      throw err;
    }

    // Dispute status check
    if (dispute.status !== DisputeStatus.NEGOTIATION) {
      const err = new Error('Dispute is not currently in NEGOTIATION phase');
      (err as any).statusCode = 400;
      (err as any).code = 'INVALID_DISPUTE_STATUS';
      throw err;
    }

    // Round ceiling check
    if (dispute.currentRound > MAX_NEGOTIATION_ROUNDS) {
      const err = new Error(
        `Negotiation has reached the maximum limit of ${MAX_NEGOTIATION_ROUNDS} rounds`
      );
      (err as any).statusCode = 400;
      (err as any).code = 'MAX_ROUNDS_EXCEEDED';
      throw err;
    }

    // Amount validation ceiling: <= calculatedDeduction & <= totalDeposit
    const maxAllowed = dispute.calculatedDeduction ?? dispute.totalDeposit;

    if (offerAmount.greaterThan(maxAllowed) || offerAmount.greaterThan(dispute.totalDeposit)) {
      const err = new Error(
        `Offer amount ₹${offerAmount.toFixed(
          2
        )} exceeds the maximum allowed deduction of ₹${maxAllowed.toFixed(2)}`
      );
      (err as any).statusCode = 400;
      (err as any).code = 'INVALID_OFFER_AMOUNT';
      throw err;
    }

    // Update previous pending offers from this user in current round to COUNTERED
    await tx.offer.updateMany({
      where: {
        disputeId: dispute.id,
        createdBy: userId,
        roundNumber: dispute.currentRound,
        status: OfferStatus.PENDING,
      },
      data: {
        status: OfferStatus.COUNTERED,
      },
    });

    // Create new offer record
    const offer = await tx.offer.create({
      data: {
        disputeId: dispute.id,
        createdBy: userId,
        roundNumber: dispute.currentRound,
        amount: offerAmount,
        message: message || null,
        status: OfferStatus.PENDING,
      },
    });

    // Update current offer on dispute record
    const disputeUpdateData: Prisma.DisputeUpdateInput = {};
    if (userRole === UserRole.TENANT) {
      disputeUpdateData.tenantOffer = offerAmount;
    } else if (userRole === UserRole.LANDLORD) {
      disputeUpdateData.landlordOffer = offerAmount;
    }

    await tx.dispute.update({
      where: { id: dispute.id },
      data: disputeUpdateData,
    });

    // Create audit log for OFFER_CREATED
    await tx.auditLog.create({
      data: {
        disputeId: dispute.id,
        userId,
        action: AuditAction.OFFER_CREATED,
        metadata: {
          round: dispute.currentRound,
          amount: offerAmount.toFixed(2),
          role: userRole,
        },
      },
    });

    // Fetch active offers for current round to check for round completion
    const roundOffers = await tx.offer.findMany({
      where: {
        disputeId: dispute.id,
        roundNumber: dispute.currentRound,
        status: OfferStatus.PENDING,
      },
      include: {
        creator: {
          select: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const tenantOfferObj = roundOffers.find((o) => o.creator.role === UserRole.TENANT);
    const landlordOfferObj = roundOffers.find((o) => o.creator.role === UserRole.LANDLORD);

    let roundEvaluationResult = null;

    // Both parties have submitted pending offers in the current round
    if (tenantOfferObj && landlordOfferObj) {
      const tOffer = tenantOfferObj.amount;
      const lOffer = landlordOfferObj.amount;
      const difference = tOffer.sub(lOffer).abs();

      const baseDeduction = dispute.calculatedDeduction ?? dispute.totalDeposit;
      const threshold = baseDeduction
        .mul(SETTLEMENT_THRESHOLD_PERCENT)
        .div(100)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      const isEligible = difference.lessThanOrEqualTo(threshold);

      if (isEligible) {
        // Settlement threshold met: mark settlement eligible, stay in NEGOTIATION
        await tx.dispute.update({
          where: { id: dispute.id },
          data: {
            settlementEligible: true,
          },
        });

        await tx.auditLog.create({
          data: {
            disputeId: dispute.id,
            userId,
            action: AuditAction.ROUND_COMPLETED,
            metadata: {
              completedRound: dispute.currentRound,
              tenantOffer: tOffer.toFixed(2),
              landlordOffer: lOffer.toFixed(2),
              difference: difference.toFixed(2),
              threshold: threshold.toFixed(2),
              settlementEligible: true,
            },
          },
        });

        roundEvaluationResult = {
          roundCompleted: dispute.currentRound,
          difference: difference.toFixed(2),
          threshold: threshold.toFixed(2),
          settlementEligible: true,
          nextStatus: DisputeStatus.NEGOTIATION,
        };
      } else {
        // Difference exceeds threshold
        if (dispute.currentRound < MAX_NEGOTIATION_ROUNDS) {
          const nextRound = dispute.currentRound + 1;

          await tx.dispute.update({
            where: { id: dispute.id },
            data: {
              currentRound: nextRound,
              settlementEligible: false,
            },
          });

          await tx.auditLog.create({
            data: {
              disputeId: dispute.id,
              userId,
              action: AuditAction.ROUND_COMPLETED,
              metadata: {
                completedRound: dispute.currentRound,
                nextRound,
                tenantOffer: tOffer.toFixed(2),
                landlordOffer: lOffer.toFixed(2),
                difference: difference.toFixed(2),
                threshold: threshold.toFixed(2),
                settlementEligible: false,
              },
            },
          });

          roundEvaluationResult = {
            roundCompleted: dispute.currentRound,
            nextRound,
            difference: difference.toFixed(2),
            threshold: threshold.toFixed(2),
            settlementEligible: false,
            nextStatus: DisputeStatus.NEGOTIATION,
          };
        } else {
          // Round 3 finished without agreement within threshold -> Move to MEDIATOR_REVIEW
          await tx.dispute.update({
            where: { id: dispute.id },
            data: {
              status: DisputeStatus.MEDIATOR_REVIEW,
              settlementEligible: false,
            },
          });

          await tx.auditLog.create({
            data: {
              disputeId: dispute.id,
              userId,
              action: AuditAction.ROUND_COMPLETED,
              metadata: {
                completedRound: MAX_NEGOTIATION_ROUNDS,
                tenantOffer: tOffer.toFixed(2),
                landlordOffer: lOffer.toFixed(2),
                difference: difference.toFixed(2),
                threshold: threshold.toFixed(2),
                settlementEligible: false,
                outcome: 'MAX_ROUNDS_EXCEEDED_REFERRED_TO_MEDIATOR',
              },
            },
          });

          roundEvaluationResult = {
            roundCompleted: MAX_NEGOTIATION_ROUNDS,
            difference: difference.toFixed(2),
            threshold: threshold.toFixed(2),
            settlementEligible: false,
            nextStatus: DisputeStatus.MEDIATOR_REVIEW,
          };
        }
      }
    }

    return {
      offerId: offer.id,
      roundNumber: offer.roundNumber,
      amount: offer.amount.toFixed(2),
      status: offer.status,
      message: offer.message,
      createdBy: userId,
      role: userRole,
      createdAt: offer.createdAt.toISOString(),
      roundEvaluation: roundEvaluationResult,
    };
  });
};
