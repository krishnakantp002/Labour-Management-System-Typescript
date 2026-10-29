import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { DashboardService } from './dashboard.service';

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const stats = await DashboardService.getStats();
    sendSuccess(res, stats, 'Dashboard statistics fetched successfully');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}
