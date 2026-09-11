import { Response, NextFunction } from 'express';
import { Prisma, DisputeStatus, AuditAction, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Helper to format Prisma Decimal objects to clean string representations for JSON responses
 */
const formatDecimal = (val: Prisma.Decimal | null | undefined): string | null => {
  if (val === null || val === undefined) return null;
  return val.toFixed(2);
};

/**
 * Helper to generate a unique case number like GP-YYYY-XXXX (e.g. GP-2026-0001)
 */
const generateCaseNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `GP-${currentYear}-`;

  const count = await prisma.dispute.count({
    where: {
      caseNumber: {
        startsWith: prefix,
      },
    },
  });

  const nextSeq = count + 1;
  const paddedSeq = String(nextSeq).padStart(4, '0');
  let candidate = `${prefix}${paddedSeq}`;

  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.dispute.findUnique({
      where: { caseNumber: candidate },
    });
    if (!existing) {
      return candidate;
    }
    attempts++;
    const randomSuffix = String(count + 1 + attempts).padStart(4, '0');
    candidate = `${prefix}${randomSuffix}`;
  }

  return candidate;
};

/**
 * POST /api/landlord/properties
 * Creates a new property
 */
export const createProperty = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { addressLine1, addressLine2, city, state, postalCode } = req.body;

    if (!addressLine1 || !city || !state) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'addressLine1, city, and state are required',
        },
      });
      return;
    }

    const property = await prisma.property.create({
      data: {
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        postalCode: postalCode || null,
      },
    });

    res.status(201).json({
      success: true,
      property: {
        id: property.id,
        addressLine1: property.addressLine1,
        addressLine2: property.addressLine2,
        city: property.city,
        state: property.state,
        postalCode: property.postalCode,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/landlord/tenancies
 * Creates a new tenancy agreement for the authenticated landlord
 */
export const createTenancy = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const landlordId = req.user?.userId;
    if (!landlordId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const {
      propertyId,
      tenantId,
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      agreementUrl,
    } = req.body;

    if (!propertyId || !tenantId || !startDate || monthlyRent === undefined || securityDeposit === undefined) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'propertyId, tenantId, startDate, monthlyRent, and securityDeposit are required',
        },
      });
      return;
    }

    // 1. Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PROPERTY_NOT_FOUND',
          message: 'Property not found',
        },
      });
      return;
    }

    // 2. Verify tenant exists and has role TENANT
    const tenant = await prisma.user.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      res.status(404).json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Tenant user not found',
        },
      });
      return;
    }
    if (tenant.role !== UserRole.TENANT) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TENANT_ROLE',
          message: 'Specified tenant user does not have TENANT role',
        },
      });
      return;
    }

    // 3. Verify landlord exists
    const landlord = await prisma.user.findUnique({
      where: { id: landlordId },
    });
    if (!landlord || landlord.role !== UserRole.LANDLORD) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Authenticated user is not a valid landlord',
        },
      });
      return;
    }

    const monthlyRentDecimal = new Prisma.Decimal(monthlyRent);
    const securityDepositDecimal = new Prisma.Decimal(securityDeposit);

    const tenancy = await prisma.tenancy.create({
      data: {
        propertyId,
        landlordId,
        tenantId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        monthlyRent: monthlyRentDecimal,
        securityDeposit: securityDepositDecimal,
        agreementUrl: agreementUrl || null,
      },
    });

    res.status(201).json({
      success: true,
      tenancy: {
        id: tenancy.id,
        propertyId: tenancy.propertyId,
        landlordId: tenancy.landlordId,
        tenantId: tenancy.tenantId,
        startDate: tenancy.startDate.toISOString(),
        endDate: tenancy.endDate ? tenancy.endDate.toISOString() : null,
        monthlyRent: formatDecimal(tenancy.monthlyRent),
        securityDeposit: formatDecimal(tenancy.securityDeposit),
        agreementUrl: tenancy.agreementUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/landlord/disputes
 * Creates a dispute and atomically logs a CASE_CREATED AuditLog in a transaction
 */
export const createDispute = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const landlordId = req.user?.userId;
    if (!landlordId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { tenancyId, claimedDeduction } = req.body;

    if (!tenancyId || claimedDeduction === undefined || claimedDeduction === null) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'tenancyId and claimedDeduction are required',
        },
      });
      return;
    }

    // 1. Verify tenancy exists
    const tenancy = await prisma.tenancy.findUnique({
      where: { id: tenancyId },
    });

    if (!tenancy) {
      res.status(404).json({
        success: false,
        error: {
          code: 'TENANCY_NOT_FOUND',
          message: 'Tenancy not found',
        },
      });
      return;
    }

    // 2. Verify authorization: authenticated landlord owns the tenancy
    if (tenancy.landlordId !== landlordId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this tenancy',
        },
      });
      return;
    }

    const claimedDeductionDecimal = new Prisma.Decimal(claimedDeduction);

    // 3. Data validation for claimed deduction
    if (
      claimedDeductionDecimal.isNegative() ||
      claimedDeductionDecimal.greaterThan(tenancy.securityDeposit)
    ) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DEDUCTION',
          message: 'Claimed deduction cannot exceed the security deposit',
        },
      });
      return;
    }

    const caseNumber = await generateCaseNumber();

    // 4. Create Dispute + AuditLog atomically in a Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      const newDispute = await tx.dispute.create({
        data: {
          caseNumber,
          tenancyId: tenancy.id,
          initiatedBy: landlordId,
          totalDeposit: tenancy.securityDeposit,
          claimedDeduction: claimedDeductionDecimal,
          calculatedDeduction: null,
          tenantOffer: null,
          landlordOffer: null,
          status: DisputeStatus.DRAFT,
          currentRound: 0,
          settlementEligible: false,
        },
      });

      await tx.auditLog.create({
        data: {
          disputeId: newDispute.id,
          userId: landlordId,
          action: AuditAction.CASE_CREATED,
          metadata: {
            caseNumber: newDispute.caseNumber,
          },
        },
      });

      return newDispute;
    });

    res.status(201).json({
      success: true,
      dispute: {
        id: result.id,
        caseNumber: result.caseNumber,
        status: result.status,
        totalDeposit: formatDecimal(result.totalDeposit),
        claimedDeduction: formatDecimal(result.claimedDeduction),
        calculatedDeduction: formatDecimal(result.calculatedDeduction),
        currentRound: result.currentRound,
        settlementEligible: result.settlementEligible,
      },
    });
  } catch (error) {
    next(error);
  }
};
