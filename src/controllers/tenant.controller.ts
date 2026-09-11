import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import {
  getTenantDisputes,
  getTenantDisputeDetails,
  moveToTenantReview,
  startNegotiation,
  submitOffer,
} from '../services/negotiation.service';

/**
 * GET /api/tenant/disputes
 * Fetches all disputes where the authenticated user is the tenant
 */
export const getDisputesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.userId;
    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const disputes = await getTenantDisputes(tenantId);

    res.json({
      success: true,
      disputes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tenant/disputes/:disputeId
 * Fetches full dispute details for tenant owner
 */
export const getDisputeDetailsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.userId;
    const disputeId = req.params.disputeId as string;

    if (!tenantId) {
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

    const dispute = await getTenantDisputeDetails(disputeId, tenantId);

    res.json({
      success: true,
      dispute,
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
 * POST /api/tenant/disputes/:disputeId/review
 * Moves dispute into TENANT_REVIEW status
 */
export const reviewDisputeHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.userId;
    const disputeId = req.params.disputeId as string;

    if (!tenantId) {
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

    const dispute = await moveToTenantReview(disputeId, tenantId);

    res.json({
      success: true,
      dispute: {
        id: dispute.id,
        caseNumber: dispute.caseNumber,
        status: dispute.status,
      },
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
 * POST /api/tenant/disputes/:disputeId/negotiate
 * Starts negotiation phase for a dispute
 */
export const startNegotiationHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.userId;
    const disputeId = req.params.disputeId as string;

    if (!tenantId) {
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

    const dispute = await startNegotiation(disputeId, tenantId);

    res.json({
      success: true,
      dispute: {
        id: dispute.id,
        caseNumber: dispute.caseNumber,
        status: dispute.status,
        currentRound: dispute.currentRound,
      },
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
 * POST /api/tenant/disputes/:disputeId/offers
 * Submits an offer on behalf of the tenant
 */
export const submitTenantOfferHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user?.userId;
    const disputeId = req.params.disputeId as string;
    const { amount, message } = req.body;

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!disputeId || amount === undefined || amount === null) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'disputeId URL parameter and offer amount are required',
        },
      });
      return;
    }

    const offerResult = await submitOffer(
      disputeId,
      tenantId,
      UserRole.TENANT,
      amount,
      message
    );

    res.status(201).json({
      success: true,
      offer: offerResult,
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'INVALID_OFFER',
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
};
