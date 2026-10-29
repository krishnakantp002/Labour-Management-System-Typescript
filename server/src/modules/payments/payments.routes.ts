import { Router } from 'express';
import * as paymentController from './payments.controller';
import { authenticateToken } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import { createPaymentSchema } from './payments.schema';

const router = Router();

// All payment routes require authentication
router.use(authenticateToken);

// ─── Payment Routes ─────────────────────────────────────────

// GET /api/payments/pending — Pending payments summary (Admin, Manager)
router.get(
  '/pending',
  roleGuard('ADMIN', 'MANAGER'),
  paymentController.pending
);

// GET /api/payments/worker/:workerId — Worker payment history + balance (Admin, Manager, Employee for own)
router.get(
  '/worker/:workerId',
  roleGuard('ADMIN', 'MANAGER', 'EMPLOYEE'),
  paymentController.workerPayments
);

// POST /api/payments — Record payment (Admin, Manager)
router.post(
  '/',
  roleGuard('ADMIN', 'MANAGER'),
  validate(createPaymentSchema),
  paymentController.create
);

// GET /api/payments — List all payments (Admin, Manager)
router.get(
  '/',
  roleGuard('ADMIN', 'MANAGER'),
  paymentController.getAll
);

// GET /api/payments/:id — Single payment (Admin, Manager)
router.get(
  '/:id',
  roleGuard('ADMIN', 'MANAGER'),
  paymentController.getOne
);

// DELETE /api/payments/:id — Delete payment (Admin, Manager)
router.delete(
  '/:id',
  roleGuard('ADMIN', 'MANAGER'),
  paymentController.remove
);

export default router;
