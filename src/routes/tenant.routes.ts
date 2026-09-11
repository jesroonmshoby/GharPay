import { Router } from 'express';
import {
  getDisputesHandler,
  getDisputeDetailsHandler,
  reviewDisputeHandler,
  startNegotiationHandler,
  submitTenantOfferHandler,
} from '../controllers/tenant.controller';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Protect all tenant routes with JWT authentication and TENANT role requirement
router.use(authenticateJwt);
router.use(requireRole([UserRole.TENANT]));

router.get('/disputes', getDisputesHandler);
router.get('/disputes/:disputeId', getDisputeDetailsHandler);
router.post('/disputes/:disputeId/review', reviewDisputeHandler);
router.post('/disputes/:disputeId/negotiate', startNegotiationHandler);
router.post('/disputes/:disputeId/offers', submitTenantOfferHandler);

export default router;
