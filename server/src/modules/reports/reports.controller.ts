import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { ReportsService } from './reports.service';

export async function getWorkerSummaryReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      sendError(res, 'startDate and endDate are required query parameters.', 400);
      return;
    }
    const report = await ReportsService.getWorkerSummary(startDate as string, endDate as string);
    sendSuccess(res, report, 'Worker summary report fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

export async function getAttendanceReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      sendError(res, 'startDate and endDate are required query parameters.', 400);
      return;
    }
    const report = await ReportsService.getAttendanceReport(startDate as string, endDate as string);
    sendSuccess(res, report, 'Attendance report fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

export async function getRateHistoryReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const report = await ReportsService.getRateHistory();
    sendSuccess(res, report, 'Rate history fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}
