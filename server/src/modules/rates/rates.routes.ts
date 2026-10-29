import { Router } from 'express';
import * as rateController from './rates.controller';
import { authenticateToken } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import {
  createProductSchema,
  updateProductSchema,
  setRateSchema,
} from './rates.schema';

const router = Router();

// All rate routes require authentication
router.use(authenticateToken);

// ─── Product Routes ─────────────────────────────────────────

// GET /api/rates/products — List all products with current rates (Admin, Manager)
router.get(
  '/products',
  roleGuard('ADMIN', 'MANAGER'),
  rateController.getProducts
);

// POST /api/rates/products — Create product (Admin only)
router.post(
  '/products',
  roleGuard('ADMIN'),
  validate(createProductSchema),
  rateController.createProduct
);

// PUT /api/rates/products/:id — Update product (Admin only)
router.put(
  '/products/:id',
  roleGuard('ADMIN'),
  validate(updateProductSchema),
  rateController.updateProduct
);

// DELETE /api/rates/products/:id — Delete product (Admin only)
router.delete(
  '/products/:id',
  roleGuard('ADMIN'),
  rateController.removeProduct
);

// ─── Rate Routes ────────────────────────────────────────────

// GET /api/rates/current — Get current rates for all products (Admin, Manager)
router.get(
  '/current',
  roleGuard('ADMIN', 'MANAGER'),
  rateController.getCurrentRates
);

// GET /api/rates/history — Rate change history (Admin, Manager)
router.get(
  '/history',
  roleGuard('ADMIN', 'MANAGER'),
  rateController.getRateHistory
);

// POST /api/rates — Set new rate for a product (Admin only)
router.post(
  '/',
  roleGuard('ADMIN'),
  validate(setRateSchema),
  rateController.setRate
);

export default router;
