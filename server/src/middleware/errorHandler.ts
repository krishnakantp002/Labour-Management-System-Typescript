import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';
import { config } from '../config';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`${req.method} ${req.path} — ${err.message}`);

  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
    return;
  }

  // MySQL Database Errors
  if (err.sqlState) {
    switch (err.code) {
      case 'ER_DUP_ENTRY': {
        res.status(409).json({
          success: false,
          message: `Duplicate entry.`,
        });
        return;
      }
      case 'ER_NO_REFERENCED_ROW_2':
        res.status(400).json({
          success: false,
          message: 'Referenced record not found. Check your references.',
        });
        return;
      case 'ER_BAD_NULL_ERROR':
        res.status(400).json({
          success: false,
          message: `Missing required field.`,
        });
        return;
      default:
        res.status(400).json({
          success: false,
          message: config.isDevelopment
            ? `Database error (${err.code}): ${err.message}`
            : 'A database error occurred.',
        });
        return;
    }
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expired. Please login again.',
    });
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: config.isDevelopment ? err.message : 'Internal server error',
    ...(config.isDevelopment && { stack: err.stack }),
  });
}
