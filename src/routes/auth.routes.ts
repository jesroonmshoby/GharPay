import { Router } from 'express';
import {
  register,
  login,
  registerLandlord,
  registerTenant,
  loginLandlord,
  getCurrentUser,
} from '../controllers/auth.controller';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/register-tenant', registerTenant);
router.post('/login', login);
router.post('/login-landlord', loginLandlord);
router.get('/me', authenticateJwt, getCurrentUser);

export default router;
