import {
  Prisma,
  DisputeStatus,
  AuditAction,
  UserRole,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateSettlementPdf } from './settlement-pdf.service';

/**
 * Helper to format Prisma Decimal objects to string or null
 */
const formatDecimal = (val: Prisma.Decimal | null | undefined): string | null => {
  if (val === null || val === undefined) return null;
  return val.toFixed(2);
};

export interface SettlementSummary {
  id: string;
  disputeId: string;
  caseNumber: string;
  agreedDeduction: string;
  refundAmount: string;
  consentTenant: boolean;
  consentLandlord: boolean;
  tenantConsentedAt: string | null;
  landlordConsentedAt: string | null;
  pdfUrl: string | null;
  settlementHash: string | null;
  disputeStatus: DisputeStatus;
  createdAt: string;
}

/**
 * Creates a settlement for a dispute (Assigned Mediator only)
 */
export const createSettlement = async (
  disputeId: string,
  agreedDeductionRaw: number | string | Prisma.Decimal,
  mediatorUserId: string
): Promise<SettlementSummary> => {
  const agreedDeduction = new Prisma.Decimal(agreedDeductionRaw);

  return await prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.findUnique({
      where: { id: disputeId },
      include: { tenancy: true },
    });

    if (!dispute) {
      const err = new Error('Dispute not found');
      (err as any).statusCode = 404;
      (err as any).code = 'NOT_FOUND';
      throw err;
    }

    if (dispute.mediatorId !== mediatorUserId) {
      const err = new Error('Only the assigned mediator can create the settlement');
      (err as any).statusCode = 403;
      (err as any).code = 'FORBIDDEN';
      throw err;
    }

    if (dispute.status !== DisputeStatus.SETTLEMENT_PENDING) {
      const err = new Error(
        `Settlement can only be created when dispute is in SETTLEMENT_PENDING status (current: ${dispute.status})`
      );
      (err as any).statusCode = 400;
      (err as any).code = 'INVALID_DISPUTE_STATUS';
      throw err;
    }

    if (!dispute.settlementEligible) {
      const err = new Error('Dispute is not eligible for settlement');
      (err as any).statusCode = 400;
      (err as any).code = 'INELIGIBLE_FOR_SETTLEMENT';
      throw err;
    }

    if (!dispute.calculatedDeduction) {
      const err = new Error('Calculated deduction is missing');
      (err as any).statusCode = 400;
      (err as any).code = 'MISSING_CALCULATED_DEDUCTION';
      throw err;
    }

    // Check if settlement already exists
    const existingSettlement = await tx.settlement.findUnique({
      where: { disputeId },
    });

    if (existingSettlement) {
      const err = new Error('A settlement already exists for this dispute');
      (err as any).statusCode = 409;
      (err as any).code = 'DUPLICATE_SETTLEMENT';
      throw err;
    }

    // Basic range validation
    if (agreedDeduction.isNegative()) {
      const err = new Error('Agreed deduction cannot be negative');
      (err as any).statusCode = 400;
      (err as any).code = 'INVALID_AGREED_DEDUCTION';
      throw err;
    }

    if (
      agreedDeduction.greaterThan(dispute.totalDeposit) ||
      agreedDeduction.greaterThan(dispute.claimedDeduction) ||
      agreedDeduction.greaterThan(dispute.calculatedDeduction)
    ) {
      const err = new Error(
        `Agreed deduction ₹${agreedDeduction.toFixed(
          2
        )} cannot exceed calculated deduction of ₹${dispute.calculatedDeduction.toFixed(2)}`
      );
      (err as any).statusCode = 400;
      (err as any).code = 'INVALID_AGREED_DEDUCTION';
      throw err;
    }

    // Bound validation against latest offers
    if (dispute.tenantOffer && dispute.landlordOffer) {
      const minOffer = Prisma.Decimal.min(dispute.tenantOffer, dispute.landlordOffer);
      const maxOffer = Prisma.Decimal.max(dispute.tenantOffer, dispute.landlordOffer);

      if (agreedDeduction.lessThan(minOffer) || agreedDeduction.greaterThan(maxOffer)) {
        const err = new Error(
          `Agreed deduction ₹${agreedDeduction.toFixed(
            2
          )} must be bounded between latest tenant offer ₹${dispute.tenantOffer.toFixed(
            2
          )} and landlord offer ₹${dispute.landlordOffer.toFixed(2)}`
        );
        (err as any).statusCode = 400;
        (err as any).code = 'INVALID_AGREED_DEDUCTION';
        throw err;
      }
    }

    const refundAmount = dispute.totalDeposit.sub(agreedDeduction);

    const settlement = await tx.settlement.create({
      data: {
        disputeId: dispute.id,
        agreedDeduction,
        refundAmount,
        consentTenant: false,
        consentLandlord: false,
        tenantConsentedAt: null,
        landlordConsentedAt: null,
        pdfUrl: null,
        settlementHash: null,
      },
    });

    await tx.auditLog.create({
      data: {
        disputeId: dispute.id,
        userId: mediatorUserId,
        action: AuditAction.SETTLEMENT_CREATED,
        metadata: {
          caseNumber: dispute.caseNumber,
          agreedDeduction: agreedDeduction.toFixed(2),
          refundAmount: refundAmount.toFixed(2),
        },
      },
    });

    return {
      id: settlement.id,
      disputeId: settlement.disputeId,
      caseNumber: dispute.caseNumber,
      agreedDeduction: formatDecimal(settlement.agreedDeduction)!,
      refundAmount: formatDecimal(settlement.refundAmount)!,
      consentTenant: settlement.consentTenant,
      consentLandlord: settlement.consentLandlord,
      tenantConsentedAt: null,
      landlordConsentedAt: null,
      pdfUrl: settlement.pdfUrl,
      settlementHash: settlement.settlementHash,
      disputeStatus: dispute.status,
      createdAt: settlement.createdAt.toISOString(),
    };
  });
};

/**
 * Fetches settlement details for authorized users (Tenant, Landlord, Assigned Mediator, Admin)
 */
export const getSettlement = async (
  disputeId: string,
  requestingUserId: string,
  requestingUserRole: UserRole
): Promise<SettlementSummary> => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      tenancy: true,
      settlement: true,
    },
  });

  if (!dispute || !dispute.settlement) {
    const err = new Error('Settlement not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  // Authorization check
  const isTenant = dispute.tenancy.tenantId === requestingUserId;
  const isLandlord = dispute.tenancy.landlordId === requestingUserId;
  const isMediator = dispute.mediatorId === requestingUserId;
  const isAdmin = requestingUserRole === UserRole.ADMIN;

  if (!isTenant && !isLandlord && !isMediator && !isAdmin) {
    const err = new Error('You are not authorized to view this settlement');
    (err as any).statusCode = 403;
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  const s = dispute.settlement;
  return {
    id: s.id,
    disputeId: s.disputeId,
    caseNumber: dispute.caseNumber,
    agreedDeduction: formatDecimal(s.agreedDeduction)!,
    refundAmount: formatDecimal(s.refundAmount)!,
    consentTenant: s.consentTenant,
    consentLandlord: s.consentLandlord,
    tenantConsentedAt: s.tenantConsentedAt ? s.tenantConsentedAt.toISOString() : null,
    landlordConsentedAt: s.landlordConsentedAt ? s.landlordConsentedAt.toISOString() : null,
    pdfUrl: s.pdfUrl,
    settlementHash: s.settlementHash,
    disputeStatus: dispute.status,
    createdAt: s.createdAt.toISOString(),
  };
};

/**
 * Records tenant consent for a settlement
 */
export const recordTenantConsent = async (
  disputeId: string,
  tenantUserId: string,
  consent: boolean
) => {
  if (consent !== true) {
    const err = new Error('Consent must be explicitly set to true');
    (err as any).statusCode = 400;
    (err as any).code = 'INVALID_CONSENT';
    throw err;
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { tenancy: true, settlement: true },
  });

  if (!dispute || !dispute.settlement) {
    const err = new Error('Settlement not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  if (dispute.tenancy.tenantId !== tenantUserId) {
    const err = new Error('Only the tenant of this dispute can provide tenant consent');
    (err as any).statusCode = 403;
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  // Idempotent check
  if (!dispute.settlement.consentTenant) {
    await prisma.$transaction(async (tx) => {
      await tx.settlement.update({
        where: { id: dispute.settlement!.id },
        data: {
          consentTenant: true,
          tenantConsentedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          disputeId: dispute.id,
          userId: tenantUserId,
          action: AuditAction.TENANT_CONSENTED,
          metadata: {
            caseNumber: dispute.caseNumber,
          },
        },
      });
    });
  }

  // Trigger completion check
  await checkAndCompleteSettlement(disputeId);

  return await getSettlement(disputeId, tenantUserId, UserRole.TENANT);
};

/**
 * Records landlord consent for a settlement
 */
export const recordLandlordConsent = async (
  disputeId: string,
  landlordUserId: string,
  consent: boolean
) => {
  if (consent !== true) {
    const err = new Error('Consent must be explicitly set to true');
    (err as any).statusCode = 400;
    (err as any).code = 'INVALID_CONSENT';
    throw err;
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { tenancy: true, settlement: true },
  });

  if (!dispute || !dispute.settlement) {
    const err = new Error('Settlement not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  if (dispute.tenancy.landlordId !== landlordUserId) {
    const err = new Error('Only the landlord of this dispute can provide landlord consent');
    (err as any).statusCode = 403;
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  // Idempotent check
  if (!dispute.settlement.consentLandlord) {
    await prisma.$transaction(async (tx) => {
      await tx.settlement.update({
        where: { id: dispute.settlement!.id },
        data: {
          consentLandlord: true,
          landlordConsentedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          disputeId: dispute.id,
          userId: landlordUserId,
          action: AuditAction.LANDLORD_CONSENTED,
          metadata: {
            caseNumber: dispute.caseNumber,
          },
        },
      });
    });
  }

  // Trigger completion check
  await checkAndCompleteSettlement(disputeId);

  return await getSettlement(disputeId, landlordUserId, UserRole.LANDLORD);
};

/**
 * Checks if both party consents are present, marks dispute SETTLED, and generates PDF
 */
export const checkAndCompleteSettlement = async (disputeId: string) => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      tenancy: {
        include: {
          property: true,
          landlord: { select: { name: true } },
          tenant: { select: { name: true } },
        },
      },
      mediator: { select: { name: true } },
      offers: { orderBy: { roundNumber: 'asc' } },
      settlement: true,
    },
  });

  if (!dispute || !dispute.settlement) return;

  const s = dispute.settlement;

  // Both parties must consent
  if (s.consentTenant && s.consentLandlord) {
    // 1. Mark dispute SETTLED if not already
    if (dispute.status !== DisputeStatus.SETTLED) {
      await prisma.$transaction(async (tx) => {
        await tx.dispute.update({
          where: { id: dispute.id },
          data: { status: DisputeStatus.SETTLED },
        });

        await tx.auditLog.create({
          data: {
            disputeId: dispute.id,
            userId: dispute.initiatedBy,
            action: AuditAction.CASE_SETTLED,
            metadata: {
              caseNumber: dispute.caseNumber,
              agreedDeduction: s.agreedDeduction.toFixed(2),
              refundAmount: s.refundAmount.toFixed(2),
            },
          },
        });
      });
    }

    // 2. Generate PDF and SHA-256 hash if not already generated
    if (!s.settlementHash || !s.pdfUrl) {
      const roundsMap = new Map<number, { landlordOffer: string | null; tenantOffer: string | null }>();

      dispute.offers.forEach((o) => {
        if (!roundsMap.has(o.roundNumber)) {
          roundsMap.set(o.roundNumber, { landlordOffer: null, tenantOffer: null });
        }
        const item = roundsMap.get(o.roundNumber)!;
        if (o.createdBy === dispute.tenancy.landlordId) {
          item.landlordOffer = o.amount.toFixed(2);
        } else if (o.createdBy === dispute.tenancy.tenantId) {
          item.tenantOffer = o.amount.toFixed(2);
        }
      });

      const roundsSummary = Array.from(roundsMap.entries()).map(([roundNumber, val]) => ({
        roundNumber,
        landlordOffer: val.landlordOffer,
        tenantOffer: val.tenantOffer,
      }));

      const pdfResult = await generateSettlementPdf({
        disputeId: dispute.id,
        caseNumber: dispute.caseNumber,
        landlordName: dispute.tenancy.landlord.name,
        tenantName: dispute.tenancy.tenant.name,
        propertyAddress: `${dispute.tenancy.property.addressLine1}, ${dispute.tenancy.property.city}, ${dispute.tenancy.property.state}`,
        securityDeposit: dispute.tenancy.securityDeposit.toFixed(2),
        calculatedDeduction: dispute.calculatedDeduction
          ? dispute.calculatedDeduction.toFixed(2)
          : '0.00',
        agreedDeduction: s.agreedDeduction.toFixed(2),
        refundAmount: s.refundAmount.toFixed(2),
        roundsSummary,
        mediatorName: dispute.mediator ? dispute.mediator.name : 'GharPay Mediator',
        tenantConsentedAt: s.tenantConsentedAt ? s.tenantConsentedAt.toISOString() : new Date().toISOString(),
        landlordConsentedAt: s.landlordConsentedAt ? s.landlordConsentedAt.toISOString() : new Date().toISOString(),
      });

      const publicPdfUrl = `/api/settlements/${dispute.id}/pdf`;

      await prisma.$transaction(async (tx) => {
        await tx.settlement.update({
          where: { id: s.id },
          data: {
            pdfUrl: publicPdfUrl,
            settlementHash: pdfResult.settlementHash,
          },
        });

        await tx.auditLog.create({
          data: {
            disputeId: dispute.id,
            userId: dispute.initiatedBy,
            action: AuditAction.PDF_GENERATED,
            metadata: {
              caseNumber: dispute.caseNumber,
              settlementHash: pdfResult.settlementHash,
            },
          },
        });
      });
    }
  }
};
