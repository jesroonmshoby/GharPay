import { Router } from 'express';
import {
  createProperty,
  createTenancy,
  createDispute,
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

export default router;
