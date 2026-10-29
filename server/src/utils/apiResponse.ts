import { Response } from 'express';
import { PaginationMeta } from '../types';

/**
 * Send a success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Send an error response
 */
export function sendError(
  res: Response,
  message: string = 'Internal Server Error',
  statusCode: number = 500,
  errors?: Record<string, unknown> | unknown[]
): void {
  const response: Record<string, unknown> = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
}

/**
 * Send a paginated success response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message: string = 'Success'
): void {
  const pagination: PaginationMeta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };

  res.status(200).json({
    success: true,
    message,
    data,
    pagination,
  });
}
