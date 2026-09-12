import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  listMediatorCases,
  getMediatorCaseDetails,
  listMyMediatorCases,
  reviewCaseByMediator,
  submitMediatorRecommendation,
  reviewClaimByMediator,
} from '../services/mediator.service';

/**
 * GET /api/mediator/cases
 * Lists all cases in MEDIATOR_REVIEW or SETTLEMENT_PENDING
 */
export const listCasesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cases = await listMediatorCases();
    res.json({
      success: true,
      cases,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mediator/my-cases
 * Lists cases assigned to the authenticated mediator
 */
export const listMyCasesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const mediatorId = req.user?.userId;
    if (!mediatorId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const cases = await listMyMediatorCases(mediatorId);
    res.json({
      success: true,
      cases,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mediator/cases/:disputeId
 * Fetches full case details for mediator review
 */
export const getCaseDetailsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const disputeId = req.params.disputeId as string;
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

    const caseDetails = await getMediatorCaseDetails(disputeId);
    res.json({
      success: true,
      caseDetails,
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
 * POST /api/mediator/cases/:disputeId/review
 * Logs case review action by the assigned mediator
 */
export const reviewCaseHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const mediatorId = req.user?.userId;
    const disputeId = req.params.disputeId as string;

    if (!mediatorId) {
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

    const result = await reviewCaseByMediator(disputeId, mediatorId);
    res.json({
      success: true,
      review: result,
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
 * POST /api/mediator/cases/:disputeId/recommendation
 * Submits structured recommendation by the assigned mediator
 */
export const submitRecommendationHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const mediatorId = req.user?.userId;
    const disputeId = req.params.disputeId as string;
    const { recommendation, note } = req.body;

    if (!mediatorId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!disputeId || !recommendation) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'disputeId URL parameter and recommendation are required',
        },
      });
      return;
    }

    const result = await submitMediatorRecommendation(
      disputeId,
      mediatorId,
      recommendation,
      note
    );

    res.json({
      success: true,
      recommendation: result,
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
 * POST /api/mediator/claims/:claimId/review
 * Mediator reviews an individual claim
 */
export const reviewClaimHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const mediatorId = req.user?.userId;
    const claimId = req.params.claimId as string;
    const { status, approvedAmount, reviewNote } = req.body;

    if (!mediatorId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!claimId || !status) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'claimId URL parameter and status are required',
        },
      });
      return;
    }

    const updatedClaim = await reviewClaimByMediator(
      claimId,
      mediatorId,
      status,
      approvedAmount,
      reviewNote
    );

    res.json({
      success: true,
      claim: updatedClaim,
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
