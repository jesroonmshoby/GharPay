import path from 'path';
import fs from 'fs';
import { Response, NextFunction } from 'express';

import {
  Prisma,
  DisputeStatus,
  ClaimCategory,
  ClaimStatus,
  EvidenceType,
  VerificationStatus,
  AuditAction,
  UserRole,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateDispute } from '../services/calculation.service';
import { getLandlordDisputes, getPendingOutsideAgreement } from '../services/negotiation.service';
import { getDefaultMediator } from '../services/mediator.service';

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
 * GET /api/landlord/disputes
 * Fetches all disputes where the authenticated user is the landlord
 */
export const getLandlordDisputesHandler = async (
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

    const disputes = await getLandlordDisputes(landlordId);

    res.json({
      success: true,
      disputes,
    });
  } catch (error) {
    next(error);
  }
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
      tenantEmail,
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      agreementUrl,
    } = req.body;

    if (!propertyId || (!tenantEmail && !tenantId) || !startDate || monthlyRent === undefined || securityDeposit === undefined) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'propertyId, tenantEmail, startDate, monthlyRent, and securityDeposit are required',
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

    // 2. Resolve & verify tenant by tenantEmail (preferred) or tenantId (UUID fallback)
    let resolvedTenant;
    if (tenantEmail) {
      const normalizedEmail = String(tenantEmail).trim().toLowerCase();
      resolvedTenant = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (!resolvedTenant) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: 'No GharPay tenant account was found with this email.',
          },
        });
        return;
      }
    } else {
      resolvedTenant = await prisma.user.findUnique({
        where: { id: tenantId },
      });
      if (!resolvedTenant) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: 'No GharPay tenant account was found with this ID.',
          },
        });
        return;
      }
    }

    if (resolvedTenant.role !== UserRole.TENANT) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TENANT_ROLE',
          message: 'The selected email is not registered as a tenant.',
        },
      });
      return;
    }

    const resolvedTenantId = resolvedTenant.id;

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
        tenantId: resolvedTenantId,
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
    const defaultMediator = await getDefaultMediator();

    const result = await prisma.$transaction(async (tx) => {
      const newDispute = await tx.dispute.create({
        data: {
          caseNumber,
          tenancyId: tenancy.id,
          initiatedBy: landlordId,
          mediatorId: defaultMediator.id,
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

/**
 * POST /api/landlord/disputes/:disputeId/claims
 * Creates a claim for an existing dispute owned by the landlord
 */
export const createClaim = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const landlordId = req.user?.userId;
    const disputeId = req.params.disputeId as string;
    const { category, description, claimedAmount } = req.body;

    if (!disputeId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'disputeId URL parameter is required',
        },
      });
      return;
    }

    if (!category || !description || claimedAmount === undefined || claimedAmount === null) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'category, description, and claimedAmount are required',
        },
      });
      return;
    }

    if (!Object.values(ClaimCategory).includes(category as ClaimCategory)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: `Category must be one of: ${Object.values(ClaimCategory).join(', ')}`,
        },
      });
      return;
    }

    const claimedAmountDecimal = new Prisma.Decimal(claimedAmount);
    if (claimedAmountDecimal.isNegative()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'claimedAmount must be greater than or equal to 0',
        },
      });
      return;
    }

    type DisputeWithTenancyAndClaims = Prisma.DisputeGetPayload<{
      include: { tenancy: true; claims: true };
    }>;

    const dispute = (await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        tenancy: true,
        claims: true,
      },
    })) as DisputeWithTenancyAndClaims | null;

    if (!dispute) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DISPUTE_NOT_FOUND',
          message: 'Dispute not found',
        },
      });
      return;
    }

    if (dispute.tenancy.landlordId !== landlordId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this dispute',
        },
      });
      return;
    }

    const existingTotal = dispute.claims.reduce(
      (sum: Prisma.Decimal, claim) => sum.add(claim.claimedAmount),
      new Prisma.Decimal(0)
    );

    const newTotal = existingTotal.add(claimedAmountDecimal);

    if (newTotal.greaterThan(dispute.claimedDeduction)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CLAIMS_EXCEED_DEDUCTION',
          message: 'Total claim amounts cannot exceed the disputed deduction',
        },
      });
      return;
    }

    const claim = await prisma.claim.create({
      data: {
        disputeId: dispute.id,
        category: category as ClaimCategory,
        description,
        claimedAmount: claimedAmountDecimal,
        approvedAmount: null,
        status: ClaimStatus.PENDING,
        calculationExplanation: null,
      },
    });

    res.status(201).json({
      success: true,
      claim: {
        id: claim.id,
        disputeId: claim.disputeId,
        category: claim.category,
        description: claim.description,
        claimedAmount: formatDecimal(claim.claimedAmount),
        approvedAmount: formatDecimal(claim.approvedAmount),
        status: claim.status,
        calculationExplanation: claim.calculationExplanation,
        createdAt: claim.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/landlord/disputes/:disputeId/claims
 * Fetches all claims for a dispute owned by the landlord
 */
export const getClaims = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const landlordId = req.user?.userId;
    const disputeId = req.params.disputeId as string;

    type DisputeWithTenancyAndClaims = Prisma.DisputeGetPayload<{
      include: { tenancy: true; claims: { include: { evidence: true } } };
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
    })) as DisputeWithTenancyAndClaims | null;

    if (!dispute) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DISPUTE_NOT_FOUND',
          message: 'Dispute not found',
        },
      });
      return;
    }

    if (dispute.tenancy.landlordId !== landlordId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this dispute',
        },
      });
      return;
    }

    const claimsFormatted = dispute.claims.map((claim) => ({
      id: claim.id,
      category: claim.category,
      description: claim.description,
      claimedAmount: formatDecimal(claim.claimedAmount),
      approvedAmount: formatDecimal(claim.approvedAmount),
      status: claim.status,
      calculationExplanation: claim.calculationExplanation,
      evidence: claim.evidence.map((ev) => ({
        id: ev.id,
        type: ev.type,
        fileUrl: ev.fileUrl,
        description: ev.description,
        verificationStatus: ev.verificationStatus,
        createdAt: ev.createdAt.toISOString(),
      })),
    }));

    res.json({
      success: true,
      claims: claimsFormatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/landlord/claims/:claimId/evidence
 * Creates evidence reference and logs EVIDENCE_UPLOADED AuditLog in a transaction
 */
export const createEvidence = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const landlordId = req.user?.userId;
    const claimId = req.params.claimId as string;
    const { type, fileUrl, description } = req.body;

    if (!claimId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'claimId URL parameter is required',
        },
      });
      return;
    }

    if (!type || !fileUrl) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'type and fileUrl are required',
        },
      });
      return;
    }

    if (!Object.values(EvidenceType).includes(type as EvidenceType)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EVIDENCE_TYPE',
          message: `Type must be one of: ${Object.values(EvidenceType).join(', ')}`,
        },
      });
      return;
    }

    type ClaimWithDispute = Prisma.ClaimGetPayload<{
      include: { dispute: { include: { tenancy: true } } };
    }>;

    const claim = (await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        dispute: {
          include: {
            tenancy: true,
          },
        },
      },
    })) as ClaimWithDispute | null;

    if (!claim) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CLAIM_NOT_FOUND',
          message: 'Claim not found',
        },
      });
      return;
    }

    if (claim.dispute.tenancy.landlordId !== landlordId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this claim',
        },
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const evidence = await tx.evidence.create({
        data: {
          claimId: claim.id,
          uploadedBy: landlordId!,
          type: type as EvidenceType,
          fileUrl,
          description: description || null,
          verificationStatus: VerificationStatus.PENDING,
        },
      });

      await tx.auditLog.create({
        data: {
          disputeId: claim.disputeId,
          userId: landlordId!,
          action: AuditAction.EVIDENCE_UPLOADED,
          metadata: {
            claimId: claim.id,
            evidenceType: evidence.type,
          },
        },
      });

      return evidence;
    });

    res.status(201).json({
      success: true,
      evidence: {
        id: result.id,
        claimId: result.claimId,
        type: result.type,
        fileUrl: result.fileUrl,
        description: result.description,
        verificationStatus: result.verificationStatus,
        uploadedBy: result.uploadedBy,
        createdAt: result.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/landlord/disputes/:disputeId
 * Fetches full dispute details with claims and evidence for the landlord owner
 */
export const getDisputeDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const landlordId = req.user?.userId;
    const disputeId = req.params.disputeId as string;

    type DisputeFull = Prisma.DisputeGetPayload<{
      include: { tenancy: true; claims: { include: { evidence: true } } };
    }>;

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        tenancy: true,
        claims: {
          include: {
            evidence: true,
            tenantComments: {
              include: {
                creator: { select: { id: true, name: true } },
                attachments: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!dispute) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DISPUTE_NOT_FOUND',
          message: 'Dispute not found',
        },
      });
      return;
    }

    if (dispute.tenancy.landlordId !== landlordId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this dispute',
        },
      });
      return;
    }

    const outsideAgreement = await getPendingOutsideAgreement(disputeId);

    res.json({
      success: true,
      dispute: {
        id: dispute.id,
        caseNumber: dispute.caseNumber,
        status: dispute.status,
        totalDeposit: formatDecimal(dispute.totalDeposit),
        claimedDeduction: formatDecimal(dispute.claimedDeduction),
        calculatedDeduction: formatDecimal(dispute.calculatedDeduction),
        currentRound: dispute.currentRound,
        settlementEligible: dispute.settlementEligible,
        outsideAgreement,
        claims: dispute.claims.map((claim) => ({
          id: claim.id,
          category: claim.category,
          description: claim.description,
          claimedAmount: formatDecimal(claim.claimedAmount),
          approvedAmount: formatDecimal(claim.approvedAmount),
          status: claim.status,
          calculationExplanation: claim.calculationExplanation,
          evidence: claim.evidence.map((ev) => ({
            id: ev.id,
            type: ev.type,
            fileUrl: ev.fileUrl,
            description: ev.description,
            verificationStatus: ev.verificationStatus,
          })),
          tenantComments: (claim as any).tenantComments ? (claim as any).tenantComments.map((tc: any) => ({
            id: tc.id,
            message: tc.message,
            createdAt: tc.createdAt,
            createdBy: tc.creator ? { id: tc.creator.id, name: tc.creator.name } : null,
            attachments: tc.attachments ? tc.attachments.map((a: any) => ({
              id: a.id,
              fileName: a.fileName,
              fileType: a.fileType,
              fileUrl: a.fileUrl,
              createdAt: a.createdAt,
            })) : [],
          })) : [],
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/landlord/disputes/:disputeId/calculate
 * Triggers the deterministic GharPay calculation engine for a dispute
 */
export const calculateDisputeHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const landlordId = req.user?.userId;
    const disputeId = req.params.disputeId as string;

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

    if (!disputeId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'disputeId URL parameter is required',
        },
      });
      return;
    }

    const result = await calculateDispute(disputeId, landlordId);

    res.json({
      success: true,
      calculation: {
        caseNumber: result.caseNumber,
        claimedDeduction: result.claimedDeduction,
        calculatedDeduction: result.calculatedDeduction,
        difference: result.difference,
        claims: result.claims,
      },
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'CALCULATION_ERROR',
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
};

/**
 * POST /api/landlord/evidence/upload
 * Saves an uploaded evidence file (base64) to local storage directory
 */
export const uploadEvidenceFileHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { fileName, fileData } = req.body;

    if (!fileName || !fileData) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Please select a file to upload.',
        },
      });
      return;
    }

    const extMatch = String(fileName).match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];

    if (!allowedExts.includes(ext)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'File type is not supported. Allowed formats: PDF, JPG, JPEG, PNG.',
        },
      });
      return;
    }

    const base64Content = fileData.includes(';base64,')
      ? fileData.split(';base64,')[1]
      : fileData;

    const fileBuffer = Buffer.from(base64Content, 'base64');

    if (fileBuffer.length > 5 * 1024 * 1024) {
      res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File is too large. Maximum allowed size is 5MB.',
        },
      });
      return;
    }

    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uploadsDir = path.join(process.cwd(), 'storage', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, safeName);
    await fs.promises.writeFile(filePath, fileBuffer);

    const relativeUrl = `/api/storage/uploads/${safeName}`;

    res.status(201).json({
      success: true,
      fileUrl: relativeUrl,
      fileName: fileName,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/landlord/claims/:claimId
 * Deletes a claim item and its associated evidence records for a dispute owned by the landlord
 */
export const deleteClaim = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const landlordId = req.user?.userId;
    const claimId = req.params.claimId as string;

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

    if (!claimId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'claimId URL parameter is required',
        },
      });
      return;
    }

    type ClaimWithDispute = Prisma.ClaimGetPayload<{
      include: { dispute: { include: { tenancy: true } } };
    }>;

    const claim = (await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        dispute: {
          include: {
            tenancy: true,
          },
        },
      },
    })) as ClaimWithDispute | null;

    if (!claim) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CLAIM_NOT_FOUND',
          message: 'Claim not found',
        },
      });
      return;
    }

    if (claim.dispute.tenancy.landlordId !== landlordId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this claim',
        },
      });
      return;
    }

    // Atomically delete evidence records first, then delete the claim
    await prisma.$transaction([
      prisma.evidence.deleteMany({ where: { claimId: claim.id } }),
      prisma.claim.delete({ where: { id: claim.id } }),
    ]);

    res.json({
      success: true,
      message: 'Claim deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/landlord/disputes/:disputeId
 * Deletes an uninitialized (DRAFT) dispute case
 */
export const deleteDisputeHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const landlordId = req.user?.userId;
    const disputeId = req.params.disputeId as string;

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

    if (!disputeId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'disputeId URL parameter is required',
        },
      });
      return;
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        tenancy: true,
        claims: true,
      },
    });

    if (!dispute) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DISPUTE_NOT_FOUND',
          message: 'Dispute case not found',
        },
      });
      return;
    }

    if (dispute.tenancy.landlordId !== landlordId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this dispute case',
        },
      });
      return;
    }

    // Uninitialized check: only DRAFT disputes can be unilaterally deleted
    if (dispute.status !== DisputeStatus.DRAFT) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_INITIALIZED_DISPUTE',
          message: 'Initialized dispute cases cannot be deleted unilaterally. Mutual consent is required to withdraw an active case.',
        },
      });
      return;
    }

    const claimIds = dispute.claims.map((c) => c.id);

    // Atomically delete evidence, claims, offers, auditLogs, settlement, and dispute
    await prisma.$transaction([
      prisma.evidence.deleteMany({ where: { claimId: { in: claimIds } } }),
      prisma.claim.deleteMany({ where: { disputeId } }),
      prisma.offer.deleteMany({ where: { disputeId } }),
      prisma.auditLog.deleteMany({ where: { disputeId } }),
      prisma.settlement.deleteMany({ where: { disputeId } }),
      prisma.dispute.delete({ where: { id: disputeId } }),
    ]);

    res.json({
      success: true,
      message: 'Uninitialized dispute case deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};



