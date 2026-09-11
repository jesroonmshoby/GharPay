import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { submitOffer } from '../services/negotiation.service';

/**
 * POST /api/landlord/disputes/:disputeId/offers
 * Submits an offer on behalf of the landlord owner
 */
export const submitLandlordOfferHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const landlordId = req.user?.userId;
    const disputeId = req.params.disputeId as string;
    const { amount, message } = req.body;

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
      landlordId,
      UserRole.LANDLORD,
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
