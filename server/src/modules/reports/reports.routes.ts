import { Router } from 'express';
import { getWorkerSummaryReport, getAttendanceReport, getRateHistoryReport } from './reports.controller';
import { authenticateToken } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';

const router = Router();

// Protect all report routes
router.use(authenticateToken);

// Admin and Manager can view reports
router.get('/worker-summary', roleGuard('ADMIN', 'MANAGER'), getWorkerSummaryReport);
router.get('/attendance', roleGuard('ADMIN', 'MANAGER'), getAttendanceReport);
router.get('/rates', roleGuard('ADMIN', 'MANAGER'), getRateHistoryReport);

export default router;
