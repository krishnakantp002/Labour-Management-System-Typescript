import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse';
import * as rateService from './rates.service';
import { rateHistoryQuery } from './rates.schema';

// ═══════════════════════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════════════════════

// ─── POST /api/rates/products ───────────────────────────────
export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const product = await rateService.createProduct(req.body);
    sendSuccess(res, product, 'Product created', 201);
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/rates/products ────────────────────────────────
export async function getProducts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const includeInactive = req.query.all === 'true';
    const products = await rateService.getProducts(includeInactive);
    sendSuccess(res, products, 'Products fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── PUT /api/rates/products/:id ────────────────────────────
export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const product = await rateService.updateProduct(req.params.id as string, req.body);
    sendSuccess(res, product, 'Product updated');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ═══════════════════════════════════════════════════════════
//  RATES
// ═══════════════════════════════════════════════════════════

// ─── DELETE /api/rates/products/:id ─────────────────────────
export async function removeProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await rateService.deleteProduct(req.params.id as string);
    sendSuccess(res, result, 'Product deleted');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── Rate Routes ────────────────────────────────────────────
export async function setRate(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const rate = await rateService.setRate(req.body, req.user.id);
    sendSuccess(res, rate, 'Rate updated', 201);
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/rates/current ─────────────────────────────────
export async function getCurrentRates(req: AuthRequest, res: Response): Promise<void> {
  try {
    const rates = await rateService.getCurrentRates();
    sendSuccess(res, rates, 'Current rates fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/rates/history ─────────────────────────────────
export async function getRateHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const filters = rateHistoryQuery.parse(req.query);
    const result = await rateService.getRateHistory(filters);
    sendPaginated(res, result.rates, result.total, result.page, result.limit, 'Rate history fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}
