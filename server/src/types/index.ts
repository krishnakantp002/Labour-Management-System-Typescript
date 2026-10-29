import { Request, Response, NextFunction } from 'express';

// ─── JWT Payload ────────────────────────────────────────────
export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

// ─── Extended Express Request ───────────────────────────────
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ─── Pagination ─────────────────────────────────────────────
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── API Responses ──────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

// ─── Async Handler Type ─────────────────────────────────────
export type AsyncRouteHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;
