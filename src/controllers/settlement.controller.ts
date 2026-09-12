import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import {
  createSettlement,
  getSettlement,
  recordTenantConsent,
  recordLandlordConsent,
  markPaymentAsPaid,
  checkAndCompleteSettlement,
} from '../services/settlement.service';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/settlements/:disputeId
 * Creates settlement for a dispute (Tenant or Landlord)
 */
export const createSettlementHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const disputeId = req.params.disputeId as string;
    const { agreedDeduction } = req.body;

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

    if (!disputeId || agreedDeduction === undefined || agreedDeduction === null) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'disputeId URL parameter and agreedDeduction are required',
        },
      });
      return;
    }

    const settlement = await createSettlement(disputeId, agreedDeduction, userId);

    res.status(201).json({
      success: true,
      settlement,
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
};

/**
 * GET /api/settlements/:disputeId
 * Fetches settlement details for authorized users (Tenant, Landlord, Admin)
 */
export const getSettlementHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const disputeId = req.params.disputeId as string;

    if (!userId || !userRole) {
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

    const settlement = await getSettlement(disputeId, userId, userRole);

    res.json({
      success: true,
      settlement,
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
};

/**
 * POST /api/settlements/:disputeId/consent/tenant
 * Records explicit consent from tenant
 */
export const tenantConsentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantUserId = req.user?.userId;
    const disputeId = req.params.disputeId as string;
    const { consent } = req.body;

    if (!tenantUserId) {
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

    const settlement = await recordTenantConsent(disputeId, tenantUserId, consent);

    res.json({
      success: true,
      settlement,
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
};

/**
 * POST /api/settlements/:disputeId/consent/landlord
 * Records explicit consent from landlord
 */
export const landlordConsentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const landlordUserId = req.user?.userId;
    const disputeId = req.params.disputeId as string;
    const { consent } = req.body;

    if (!landlordUserId) {
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

    const settlement = await recordLandlordConsent(disputeId, landlordUserId, consent);

    res.json({
      success: true,
      settlement,
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
};

/**
 * POST /api/settlements/:disputeId/mark-paid
 * Landlord-only action to mark refund as paid outside GharPay
 */
export const markPaymentAsPaidHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const landlordUserId = req.user?.userId;
    const disputeId = req.params.disputeId as string;

    if (!landlordUserId) {
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

    const settlement = await markPaymentAsPaid(disputeId, landlordUserId);

    res.json({
      success: true,
      message: 'Refund payment marked as paid outside GharPay.',
      settlement,
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
};

/**
 * GET /api/settlements/:disputeId/pdf
 * Downloads generated settlement PDF document (Authorized users only)
 */
export const downloadPdfHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const disputeId = req.params.disputeId as string;

    if (!userId || !userRole) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { tenancy: true, settlement: true },
    });

    if (!dispute || !dispute.settlement) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Settlement document not found',
        },
      });
      return;
    }

    // Authorization check
    const isTenant = dispute.tenancy.tenantId === userId;
    const isLandlord = dispute.tenancy.landlordId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isTenant && !isLandlord && !isAdmin) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to download this PDF',
        },
      });
      return;
    }

    const storageDir = path.join(process.cwd(), 'storage', 'settlements');
    const safeFileName = path.basename(`${dispute.caseNumber}_settlement.pdf`);
    const filePath = path.join(storageDir, safeFileName);

    // If PDF file does not exist on disk, generate it lazily now
    if (!fs.existsSync(filePath)) {
      await checkAndCompleteSettlement(disputeId, true);
    }

    if (!fs.existsSync(filePath)) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FILE_GENERATION_FAILED',
          message: 'Unable to generate PDF document on server',
        },
      });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${safeFileName}"`
    );
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};
