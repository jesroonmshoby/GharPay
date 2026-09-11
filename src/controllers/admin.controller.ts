import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { assignMediator } from '../services/mediator.service';

/**
 * POST /api/admin/disputes/:disputeId/assign
 * Assigns a mediator user to a dispute (Admin only)
 */
export const assignMediatorHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminUserId = req.user?.userId;
    const disputeId = req.params.disputeId as string;
    const { mediatorId } = req.body;

    if (!adminUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!disputeId || !mediatorId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'disputeId URL parameter and mediatorId are required',
        },
      });
      return;
    }

    const assignment = await assignMediator(disputeId, mediatorId, adminUserId);

    res.json({
      success: true,
      assignment,
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
