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

// GET /api/payments/pending — Pending payments summary (Admin)
router.get(
  '/pending',
  roleGuard('ADMIN'),
  paymentController.pending
);

// GET /api/payments/worker/:workerId — Worker payment history + balance (Admin, Employee for own)
router.get(
  '/worker/:workerId',
  roleGuard('ADMIN', 'MANAGER', 'EMPLOYEE'),
  paymentController.workerPayments
);

// POST /api/payments — Record payment (Admin only)
router.post(
  '/',
  roleGuard('ADMIN'),
  validate(createPaymentSchema),
  paymentController.create
);

// GET /api/payments — List all payments (Admin)
router.get(
  '/',
  roleGuard('ADMIN'),
  paymentController.getAll
);

// GET /api/payments/:id — Single payment (Admin)
router.get(
  '/:id',
  roleGuard('ADMIN'),
  paymentController.getOne
);

// DELETE /api/payments/:id — Delete payment (Admin only)
router.delete(
  '/:id',
  roleGuard('ADMIN'),
  paymentController.remove
);

export default router;
