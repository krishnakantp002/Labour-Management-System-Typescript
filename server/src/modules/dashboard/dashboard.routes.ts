import { Router } from 'express';
import { getDashboardStats } from './dashboard.controller';
import { authenticateToken } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';

const router = Router();

// Protect all dashboard routes
router.use(authenticateToken);

// Admin and Manager can view dashboard stats
router.get(
  '/stats',
  roleGuard('ADMIN', 'MANAGER'),
  getDashboardStats
);

export default router;
