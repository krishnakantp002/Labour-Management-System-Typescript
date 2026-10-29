import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticateToken } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from './auth.schema';

const router = Router();

// ─── Public Routes ──────────────────────────────────────────

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/refresh
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

// ─── Protected Routes ───────────────────────────────────────

// POST /api/auth/register (Admin only — creates managers/employees)
router.post(
  '/register',
  authenticateToken,
  roleGuard('ADMIN'),
  validate(registerSchema),
  authController.register
);

// GET /api/auth/me (any authenticated user)
router.get('/me', authenticateToken, authController.getMe);

// PUT /api/auth/change-password (any authenticated user)
router.put(
  '/change-password',
  authenticateToken,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
