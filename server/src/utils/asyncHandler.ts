import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

/**
 * Wraps async route handlers to automatically catch errors
 * and forward them to Express error handling middleware.
 *
 * Usage: router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
  };
}
