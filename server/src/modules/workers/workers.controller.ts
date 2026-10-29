import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse';
import * as workerService from './workers.service';
import { listWorkersQuery } from './workers.schema';

// ─── POST /api/workers ──────────────────────────────────────
export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401);
      return;
    }
    const worker = await workerService.createWorker(req.body, req.user.id);
    sendSuccess(res, worker, 'Worker created successfully', 201);
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/workers ───────────────────────────────────────
export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Parse and validate query params
    const filters = listWorkersQuery.parse(req.query);
    const result = await workerService.getWorkers(filters);
    sendPaginated(res, result.workers, result.total, result.page, result.limit, 'Workers fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/workers/:id ───────────────────────────────────
export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const worker = await workerService.getWorkerById(req.params.id as string);
    sendSuccess(res, worker, 'Worker fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── PUT /api/workers/:id ───────────────────────────────────
export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const worker = await workerService.updateWorker(req.params.id as string, req.body);
    sendSuccess(res, worker, 'Worker updated successfully');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── PATCH /api/workers/:id/status ──────────────────────────
export async function updateStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const worker = await workerService.updateWorkerStatus(req.params.id as string, req.body);
    sendSuccess(res, worker, `Worker status changed to ${worker.status}`);
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── DELETE /api/workers/:id ────────────────────────────────
export async function remove(req: AuthRequest, res: Response): Promise<void> {
  try {
    const worker = await workerService.deleteWorker(req.params.id as string);
    sendSuccess(res, worker, 'Worker deleted successfully');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}
