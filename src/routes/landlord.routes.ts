import { Router } from 'express';
import {
  createProperty,
  createTenancy,
  createDispute,
  getLandlordDisputesHandler,
  createClaim,
  deleteClaim,
  deleteDisputeHandler,
  getClaims,
  createEvidence,
  uploadEvidenceFileHandler,
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

router.get('/disputes', getLandlordDisputesHandler);
router.delete('/disputes/:disputeId', deleteDisputeHandler);
router.post('/properties', createProperty);
router.post('/tenancies', createTenancy);
router.post('/disputes', createDispute);

router.post('/disputes/:disputeId/claims', createClaim);
router.delete('/claims/:claimId', deleteClaim);
router.get('/disputes/:disputeId/claims', getClaims);
router.post('/evidence/upload', uploadEvidenceFileHandler);
router.post('/claims/:claimId/evidence', createEvidence);
router.get('/disputes/:disputeId', getDisputeDetails);


router.post('/disputes/:disputeId/calculate', calculateDisputeHandler);
router.post('/disputes/:disputeId/offers', submitLandlordOfferHandler);

export default router;
