import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sendError } from '../utils/apiResponse';

/**
 * Role-Based Access Control Middleware
 *
 * Checks if the authenticated user's role is among the allowed roles.
 * MUST be used AFTER authenticateToken middleware.
 *
 * Usage:
 *   router.post('/route', authenticateToken, roleGuard('ADMIN'), controller)
 *   router.get('/route', authenticateToken, roleGuard('ADMIN', 'MANAGER'), controller)
 */
export function roleGuard(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required.', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        403
      );
      return;
    }

    next();
  };
}
