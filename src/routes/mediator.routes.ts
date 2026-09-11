import { Router } from 'express';
import {
  listCasesHandler,
  listMyCasesHandler,
  getCaseDetailsHandler,
  reviewCaseHandler,
  submitRecommendationHandler,
} from '../controllers/mediator.controller';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Protect all mediator routes with JWT authentication and MEDIATOR role requirement
router.use(authenticateJwt);
router.use(requireRole([UserRole.MEDIATOR]));

router.get('/cases', listCasesHandler);
router.get('/my-cases', listMyCasesHandler);
router.get('/cases/:disputeId', getCaseDetailsHandler);
router.post('/cases/:disputeId/review', reviewCaseHandler);
router.post('/cases/:disputeId/recommendation', submitRecommendationHandler);

export default router;
