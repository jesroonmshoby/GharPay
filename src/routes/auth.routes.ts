import { Router } from 'express';
import {
  registerLandlord,
  registerTenant,
  loginLandlord,
  getCurrentUser,
} from '../controllers/auth.controller';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

router.post('/register', registerLandlord);
router.post('/register-tenant', registerTenant);
router.post('/login', loginLandlord);
router.get('/me', authenticateJwt, getCurrentUser);

export default router;
