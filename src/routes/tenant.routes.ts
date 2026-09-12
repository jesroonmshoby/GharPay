import { Router } from 'express';
import {
  getDisputesHandler,
  getDisputeDetailsHandler,
  reviewDisputeHandler,
  startNegotiationHandler,
  submitTenantOfferHandler,
} from '../controllers/tenant.controller';
import {
  createTenantCommentHandler,
  getTenantCommentsHandler,
  uploadTenantProofHandler,
} from '../controllers/tenantComment.controller';
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

// Tenant Claim Comments & Proof Upload Endpoints
router.post('/claims/:claimId/comments', createTenantCommentHandler);
router.get('/claims/:claimId/comments', getTenantCommentsHandler);
router.post('/proof/upload', uploadTenantProofHandler);

export default router;
