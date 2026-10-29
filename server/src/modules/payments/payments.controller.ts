import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse';
import * as paymentService from './payments.service';
import { paymentQuerySchema } from './payments.schema';

// ─── POST /api/payments ─────────────────────────────────────
export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const payment = await paymentService.createPayment(req.body, req.user.id);
    sendSuccess(res, payment, 'Payment recorded', 201);
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/payments ──────────────────────────────────────
export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const filters = paymentQuerySchema.parse(req.query);
    const result = await paymentService.getPayments(filters);
    sendPaginated(res, result.payments, result.total, result.page, result.limit, 'Payments fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/payments/pending ──────────────────────────────
export async function pending(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await paymentService.getPendingPayments();
    sendSuccess(res, result, 'Pending payments fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/payments/:id ──────────────────────────────────
export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const payment = await paymentService.getPaymentById(req.params.id as string);
    sendSuccess(res, payment, 'Payment fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/payments/worker/:workerId ─────────────────────
export async function workerPayments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const result = await paymentService.getWorkerPayments(
      req.params.workerId as string,
      startDate,
      endDate
    );
    sendSuccess(res, result, 'Worker payment history fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── DELETE /api/payments/:id ───────────────────────────────
export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const payment = await paymentService.deletePayment(req.params.id as string);
    sendSuccess(res, payment, 'Payment deleted');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}
