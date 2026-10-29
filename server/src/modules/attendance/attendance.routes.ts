import { Router } from 'express';
import * as attendanceController from './attendance.controller';
import { authenticateToken } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import {
  markAttendanceSchema,
  bulkAttendanceSchema,
  updateAttendanceSchema,
} from './attendance.schema';

const router = Router();

// All attendance routes require authentication
router.use(authenticateToken);

// ─── Attendance Routes ──────────────────────────────────────

// GET /api/attendance/today — Today's summary (Admin, Manager)
router.get(
  '/today',
  roleGuard('ADMIN', 'MANAGER'),
  attendanceController.todaySummary
);

// GET /api/attendance/worker/:workerId — Worker history (Admin, Manager, Employee for own)
router.get(
  '/worker/:workerId',
  roleGuard('ADMIN', 'MANAGER', 'EMPLOYEE'),
  attendanceController.workerHistory
);

// POST /api/attendance — Mark single attendance (Admin, Manager)
router.post(
  '/',
  roleGuard('ADMIN', 'MANAGER'),
  validate(markAttendanceSchema),
  attendanceController.mark
);

// POST /api/attendance/bulk — Bulk mark attendance (Admin, Manager)
router.post(
  '/bulk',
  roleGuard('ADMIN', 'MANAGER'),
  validate(bulkAttendanceSchema),
  attendanceController.bulkMark
);

// GET /api/attendance — List attendance (Admin, Manager)
router.get(
  '/',
  roleGuard('ADMIN', 'MANAGER'),
  attendanceController.getAll
);

// PUT /api/attendance/:id — Update attendance record (Admin, Manager)
router.put(
  '/:id',
  roleGuard('ADMIN', 'MANAGER'),
  validate(updateAttendanceSchema),
  attendanceController.update
);

export default router;
