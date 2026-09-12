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

  if (dispute.tenancy.landlordId !== userId && dispute.tenancy.tenantId !== userId) {
    const err = new Error('You do not have access to this dispute');
    (err as any).statusCode = 403;
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  const evaluatedClaims = dispute.claims.map((claim) => {
    const approvedAmountDecimal = calculateCategoryApproval(claim.category, claim.claimedAmount);
    const rule = calculationRules[claim.category];

    const explanation = `GharPay calculated deduction of ₹${approvedAmountDecimal.toFixed(2)} under ${rule.name}.`;

    return {
      id: claim.id,
      category: claim.category,
      claimedAmountDecimal: claim.claimedAmount,
      approvedAmountDecimal,
      status: ClaimStatus.APPROVED,
      newStatus: ClaimStatus.APPROVED,
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
          approvedAmount: evaluated.approvedAmountDecimal,
          status: evaluated.status,
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
