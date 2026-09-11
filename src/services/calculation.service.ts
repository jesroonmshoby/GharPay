import {
  Prisma,
  DisputeStatus,
  ClaimStatus,
  AuditAction,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calculationRules, calculateCategoryApproval } from '../config/calculationRules';

export interface CalculatedClaimResult {
  id: string;
  category: string;
  claimedAmount: string;
  approvedAmount: string;
  status: ClaimStatus;
  explanation: string;
}

export interface DisputeCalculationResult {
  disputeId: string;
  caseNumber: string;
  claimedDeduction: string;
  calculatedDeduction: string;
  difference: string;
  status: DisputeStatus;
  claims: CalculatedClaimResult[];
}

export const calculateDispute = async (
  disputeId: string,
  userId: string
): Promise<DisputeCalculationResult> => {
  type FullDispute = Prisma.DisputeGetPayload<{
    include: {
      tenancy: true;
      claims: {
        include: {
          evidence: true;
        };
      };
    };
  }>;

  const dispute = (await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      tenancy: true,
      claims: {
        include: {
          evidence: true,
        },
      },
    },
  })) as FullDispute | null;

  if (!dispute) {
    const err = new Error('Dispute not found');
    (err as any).statusCode = 404;
    (err as any).code = 'DISPUTE_NOT_FOUND';
    throw err;
  }

  if (dispute.tenancy.landlordId !== userId) {
    const err = new Error('You do not have access to this dispute');
    (err as any).statusCode = 403;
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  // Verify all claims have been reviewed by mediator
  const unreviewedClaims = dispute.claims.filter(
    (c) => c.status === ClaimStatus.PENDING || c.status === ClaimStatus.NEEDS_CLARIFICATION
  );

  if (unreviewedClaims.length > 0) {
    const err = new Error('All claims must be reviewed by the mediator before calculation.');
    (err as any).statusCode = 400;
    (err as any).code = 'CLAIMS_AWAITING_MEDIATOR_REVIEW';
    throw err;
  }

  const evaluatedClaims = dispute.claims.map((claim) => {
    const approvedAmountDecimal = claim.approvedAmount || new Prisma.Decimal(0);
    const rule = calculationRules[claim.category];

    let explanation = claim.calculationExplanation;
    if (!explanation) {
      if (claim.status === ClaimStatus.APPROVED) {
        explanation = `Approved at ₹${approvedAmountDecimal.toFixed(2)} based on mediator review under ${rule.name}.`;
      } else if (claim.status === ClaimStatus.PARTIAL) {
        explanation = `Partially approved at ₹${approvedAmountDecimal.toFixed(2)} based on mediator review under ${rule.name}.`;
      } else if (claim.status === ClaimStatus.REJECTED) {
        explanation = `Rejected at ₹0.00 based on mediator review under ${rule.name}.`;
      } else {
        explanation = `Evaluated at ₹${approvedAmountDecimal.toFixed(2)} based on mediator review.`;
      }
    }

    return {
      id: claim.id,
      category: claim.category,
      claimedAmountDecimal: claim.claimedAmount,
      approvedAmountDecimal,
      status: claim.status,
      newStatus: claim.status,
      explanation,
    };
  });

  const totalApprovedDecimal = evaluatedClaims.reduce(
    (sum, claim) => sum.add(claim.approvedAmountDecimal),
    new Prisma.Decimal(0)
  );

  const differenceDecimal = dispute.claimedDeduction.sub(totalApprovedDecimal);

  await prisma.$transaction(async (tx) => {
    for (const evaluated of evaluatedClaims) {
      await tx.claim.update({
        where: { id: evaluated.id },
        data: {
          calculationExplanation: evaluated.explanation,
        },
      });
    }

    await tx.dispute.update({
      where: { id: dispute.id },
      data: {
        calculatedDeduction: totalApprovedDecimal,
        status: DisputeStatus.CALCULATED,
        settlementEligible: false,
      },
    });

    await tx.auditLog.create({
      data: {
        disputeId: dispute.id,
        userId,
        action: AuditAction.CALCULATION_GENERATED,
        metadata: {
          claimedDeduction: dispute.claimedDeduction.toFixed(2),
          calculatedDeduction: totalApprovedDecimal.toFixed(2),
          difference: differenceDecimal.toFixed(2),
        },
      },
    });
  });

  return {
    disputeId: dispute.id,
    caseNumber: dispute.caseNumber,
    claimedDeduction: dispute.claimedDeduction.toFixed(2),
    calculatedDeduction: totalApprovedDecimal.toFixed(2),
    difference: differenceDecimal.toFixed(2),
    status: DisputeStatus.CALCULATED,
    claims: evaluatedClaims.map((c) => ({
      id: c.id,
      category: c.category,
      claimedAmount: c.claimedAmountDecimal.toFixed(2),
      approvedAmount: c.approvedAmountDecimal.toFixed(2),
      status: c.newStatus,
      explanation: c.explanation,
    })),
  };
};
