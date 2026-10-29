import { Router } from 'express';
import * as workController from './work.controller';
import { authenticateToken } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import {
  createWorkEntrySchema,
  bulkWorkEntrySchema,
} from './work.schema';

const router = Router();

// All work routes require authentication
router.use(authenticateToken);

// ─── Work Entry Routes ──────────────────────────────────────

// GET /api/work/daily — Daily work summary (Admin, Manager)
router.get(
  '/daily',
  roleGuard('ADMIN', 'MANAGER'),
  workController.dailySummary
);

// GET /api/work/worker/:workerId — Worker earnings (Admin, Manager, Employee for own)
router.get(
  '/worker/:workerId',
  roleGuard('ADMIN', 'MANAGER', 'EMPLOYEE'),
  workController.workerEarnings
);

// POST /api/work — Record single work entry (Admin, Manager)
router.post(
  '/',
  roleGuard('ADMIN', 'MANAGER'),
  validate(createWorkEntrySchema),
  workController.create
);

// POST /api/work/bulk — Bulk record work entries (Admin, Manager)
router.post(
  '/bulk',
  roleGuard('ADMIN', 'MANAGER'),
  validate(bulkWorkEntrySchema),
  workController.bulkCreate
);

// GET /api/work — List work entries (Admin, Manager)
router.get(
  '/',
  roleGuard('ADMIN', 'MANAGER'),
  workController.getAll
);

// GET /api/work/:id — Get single work entry (Admin, Manager)
router.get(
  '/:id',
  roleGuard('ADMIN', 'MANAGER'),
  workController.getOne
);

// DELETE /api/work/:id — Delete work entry (Admin only)
router.delete(
  '/:id',
  roleGuard('ADMIN'),
  workController.remove
);

export default router;
