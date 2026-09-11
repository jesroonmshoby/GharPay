import { Router } from 'express';
import {
  createSettlementHandler,
  getSettlementHandler,
  tenantConsentHandler,
  landlordConsentHandler,
  downloadPdfHandler,
} from '../controllers/settlement.controller';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

// Protect all settlement routes with JWT authentication
router.use(authenticateJwt);

router.post('/:disputeId', createSettlementHandler);
router.get('/:disputeId', getSettlementHandler);
router.post('/:disputeId/consent/tenant', tenantConsentHandler);
router.post('/:disputeId/consent/landlord', landlordConsentHandler);
router.get('/:disputeId/pdf', downloadPdfHandler);

export default router;
