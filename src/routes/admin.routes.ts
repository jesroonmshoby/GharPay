import { Router } from 'express';
import { assignMediatorHandler } from '../controllers/admin.controller';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Protect all admin routes with JWT authentication and ADMIN role requirement
router.use(authenticateJwt);
router.use(requireRole([UserRole.ADMIN]));

router.post('/disputes/:disputeId/assign', assignMediatorHandler);

export default router;
