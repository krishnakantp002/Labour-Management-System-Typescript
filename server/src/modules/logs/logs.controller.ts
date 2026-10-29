import { Response } from 'express';
import { AuthRequest } from '../../types';
import { query } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';

// ─── GET /api/logs — recent activity (Admin only) ────────────
export async function getLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const search = (req.query.search as string || '').trim();

    const params: unknown[] = [];
    let where = '';
    if (search) {
      where = `WHERE COALESCE(u.name, l.actor_name) LIKE ? OR l.action LIKE ? OR l.route LIKE ? OR l.details LIKE ?`;
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    const rowsResult = await query<{
      id: number;
      actor_name: string;
      actor_role: string;
      action: string;
      entity_type: string;
      method: string;
      route: string;
      status_code: number;
      ip: string | null;
      details: string | null;
      created_at: string;
    }>(
      `SELECT l.id, COALESCE(u.name, l.actor_name) AS actor_name,
              COALESCE(l.actor_role, u.role) AS actor_role,
              l.action, l.entity_type, l.method, l.route,
              l.status_code, l.ip, l.details, l.created_at
       FROM activity_logs l
       LEFT JOIN users u ON u.id = l.actor_id
       ${where}
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM activity_logs ${where}`,
      params
    );

    res.status(200).json({
      success: true,
      message: 'Activity logs fetched',
      data: rowsResult.rows,
      pagination: {
        total: countResult.rows[0]?.total || 0,
        limit,
        offset,
        returned: rowsResult.rows.length,
      },
    });
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}
