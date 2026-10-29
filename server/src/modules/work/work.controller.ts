import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse';
import * as workService from './work.service';
import { workEntryQuery } from './work.schema';

// ─── POST /api/work ─────────────────────────────────────────
export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const entry = await workService.createWorkEntry(req.body, req.user.id);
    sendSuccess(res, entry, 'Work entry recorded', 201);
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── POST /api/work/bulk ────────────────────────────────────
export async function bulkCreate(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const result = await workService.bulkCreateWorkEntries(req.body, req.user.id);
    sendSuccess(res, result, `${result.totalEntries} work entries recorded`, 201);
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/work ──────────────────────────────────────────
export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const filters = workEntryQuery.parse(req.query);
    const result = await workService.getWorkEntries(filters);
    sendPaginated(res, result.workEntries, result.total, result.page, result.limit, 'Work entries fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/work/daily ────────────────────────────────────
export async function dailySummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const date = req.query.date as string | undefined;
    const summary = await workService.getDailySummary(date);
    sendSuccess(res, summary, `Work summary for ${summary.date}`);
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/work/:id ──────────────────────────────────────
export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const entry = await workService.getWorkEntryById(req.params.id as string);
    sendSuccess(res, entry, 'Work entry fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/work/worker/:workerId ─────────────────────────
export async function workerEarnings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const result = await workService.getWorkerEarnings(
      req.params.workerId as string,
      startDate,
      endDate
    );
    sendSuccess(res, result, 'Worker earnings fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── DELETE /api/work/:id ───────────────────────────────────
export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const entry = await workService.deleteWorkEntry(req.params.id as string);
    sendSuccess(res, entry, 'Work entry deleted');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}
