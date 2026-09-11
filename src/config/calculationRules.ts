import { ClaimCategory, Prisma } from '@prisma/client';

export interface CategoryRule {
  name: string;
  policyDescription: string;
  multiplierNumerator: number;
  multiplierDenominator: number;
  requiresEvidence: boolean;
}

export const calculationRules: Record<ClaimCategory, CategoryRule> = {
  PAINTING: {
    name: 'configured GharPay painting adjustment policy',
    policyDescription: 'evaluated under the configured GharPay painting adjustment policy',
    multiplierNumerator: 7,
    multiplierDenominator: 12,
    requiresEvidence: true,
  },
  FIXTURE: {
    name: 'configured GharPay fixture adjustment policy',
    policyDescription: 'evaluated under the configured GharPay fixture adjustment policy',
    multiplierNumerator: 7,
    multiplierDenominator: 12,
    requiresEvidence: true,
  },
  UTILITIES: {
    name: 'configured GharPay ODR policy',
    policyDescription: 'evaluated against the supported utility amount under the configured GharPay ODR policy',
    multiplierNumerator: 7,
    multiplierDenominator: 8,
    requiresEvidence: true,
  },
  UNPAID_RENT: {
    name: 'configured GharPay unpaid rent policy',
    policyDescription: 'evaluated under the configured GharPay unpaid rent policy',
    multiplierNumerator: 1,
    multiplierDenominator: 1,
    requiresEvidence: true,
  },
  CLEANING: {
    name: 'configured GharPay cleaning adjustment policy',
    policyDescription: 'evaluated under the configured GharPay cleaning adjustment policy',
    multiplierNumerator: 1,
    multiplierDenominator: 1,
    requiresEvidence: true,
  },
};

/**
 * Calculates approved Decimal amount for a given category and claimed amount safely using Prisma.Decimal
 */
export const calculateCategoryApproval = (
  category: ClaimCategory,
  claimedAmount: Prisma.Decimal
): Prisma.Decimal => {
  const rule = calculationRules[category];
  if (!rule) {
    return new Prisma.Decimal(0);
  }

  const approved = claimedAmount
    .mul(rule.multiplierNumerator)
    .div(rule.multiplierDenominator)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  if (approved.greaterThan(claimedAmount)) {
    return claimedAmount;
  }

  return approved;
};
