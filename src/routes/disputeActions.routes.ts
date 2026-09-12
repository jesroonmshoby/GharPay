import { Router } from 'express';
import {
  proposeOutsideAgreementHandler,
  respondOutsideAgreementHandler,
  submitCourtApplicationHandler,
  requestMediatorReviewHandler,
} from '../controllers/disputeActions.controller';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

// Protect all dispute action routes with JWT authentication
router.use(authenticateJwt);

router.post('/:disputeId/outside-agreement/propose', proposeOutsideAgreementHandler);
router.post('/:disputeId/outside-agreement/respond', respondOutsideAgreementHandler);
router.post('/:disputeId/court-application', submitCourtApplicationHandler);
router.post('/:disputeId/request-mediator-review', requestMediatorReviewHandler);

export default router;
