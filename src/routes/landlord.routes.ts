import { Router } from 'express';
import {
  createProperty,
  createTenancy,
  createDispute,
  createClaim,
  getClaims,
  createEvidence,
  getDisputeDetails,
  calculateDisputeHandler,
} from '../controllers/landlord.controller';
import { submitLandlordOfferHandler } from '../controllers/negotiation.controller';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Protect all landlord routes with JWT authentication and LANDLORD role requirement
router.use(authenticateJwt);
router.use(requireRole([UserRole.LANDLORD]));

router.post('/properties', createProperty);
router.post('/tenancies', createTenancy);
router.post('/disputes', createDispute);

router.post('/disputes/:disputeId/claims', createClaim);
router.get('/disputes/:disputeId/claims', getClaims);
router.post('/claims/:claimId/evidence', createEvidence);
router.get('/disputes/:disputeId', getDisputeDetails);

router.post('/disputes/:disputeId/calculate', calculateDisputeHandler);
router.post('/disputes/:disputeId/offers', submitLandlordOfferHandler);

export default router;
