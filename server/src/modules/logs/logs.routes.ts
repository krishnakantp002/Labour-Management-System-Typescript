import { Router } from 'express';
import { getLogs } from './logs.controller';
import { authenticateToken } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';

const router = Router();

// ALL log routes are Admin-only — this is the audit trail
router.use(authenticateToken, roleGuard('ADMIN'));

// GET /api/logs — recent activity with search + pagination
router.get('/', getLogs);

export default router;
