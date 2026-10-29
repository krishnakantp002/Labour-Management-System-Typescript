import { Router } from 'express';
import * as workerController from './workers.controller';
import { authenticateToken } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import {
  createWorkerSchema,
  updateWorkerSchema,
  updateStatusSchema,
} from './workers.schema';

const router = Router();

// All worker routes require authentication
router.use(authenticateToken);

// ─── CRUD Routes ────────────────────────────────────────────

// POST /api/workers — Create worker (Admin, Manager)
router.post(
  '/',
  roleGuard('ADMIN', 'MANAGER'),
  validate(createWorkerSchema),
  workerController.create
);

// GET /api/workers — List all workers (Admin, Manager)
router.get(
  '/',
  roleGuard('ADMIN', 'MANAGER'),
  workerController.getAll
);

// GET /api/workers/:id — Get single worker (Admin, Manager)
router.get(
  '/:id',
  roleGuard('ADMIN', 'MANAGER'),
  workerController.getOne
);

// PUT /api/workers/:id — Update worker details (Admin, Manager)
router.put(
  '/:id',
  roleGuard('ADMIN', 'MANAGER'),
  validate(updateWorkerSchema),
  workerController.update
);

// PATCH /api/workers/:id/status — Toggle worker status (Admin only)
router.patch(
  '/:id/status',
  roleGuard('ADMIN'),
  validate(updateStatusSchema),
  workerController.updateStatus
);

// DELETE /api/workers/:id — Delete worker (Admin only)
router.delete(
  '/:id',
  roleGuard('ADMIN'),
  workerController.remove
);

export default router;
