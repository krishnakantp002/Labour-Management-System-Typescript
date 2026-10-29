import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse';
import * as attendanceService from './attendance.service';
import { attendanceQuerySchema } from './attendance.schema';

// ─── POST /api/attendance ───────────────────────────────────
export async function mark(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const attendance = await attendanceService.markAttendance(req.body, req.user.id);
    sendSuccess(res, attendance, 'Attendance marked', 201);
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── POST /api/attendance/bulk ──────────────────────────────
export async function bulkMark(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const result = await attendanceService.bulkMarkAttendance(req.body, req.user.id);
    sendSuccess(res, result, `Attendance marked for ${result.totalMarked} workers`, 201);
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/attendance ────────────────────────────────────
export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const filters = attendanceQuerySchema.parse(req.query);
    const result = await attendanceService.getAttendance(filters);
    sendPaginated(res, result.attendance, result.total, result.page, result.limit, 'Attendance fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/attendance/today ──────────────────────────────
export async function todaySummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const summary = await attendanceService.getTodaySummary();
    sendSuccess(res, summary, "Today's attendance summary");
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── PUT /api/attendance/:id ────────────────────────────────
export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const attendance = await attendanceService.updateAttendance(req.params.id as string, req.body);
    sendSuccess(res, attendance, 'Attendance updated');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/attendance/worker/:workerId ────────────────────
export async function workerHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const month = req.query.month as string | undefined; // optional: ?month=2026-08
    const result = await attendanceService.getWorkerAttendance(req.params.workerId as string, month);
    sendSuccess(res, result, 'Worker attendance history');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}
