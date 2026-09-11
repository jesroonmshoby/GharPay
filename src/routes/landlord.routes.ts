import { Router } from 'express';
import {
  createProperty,
  createTenancy,
  createDispute,
  createClaim,
  getClaims,
  createEvidence,
  getDisputeDetails,
} from '../controllers/landlord.controller';
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

export default router;
