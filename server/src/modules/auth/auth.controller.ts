import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import * as authService from './auth.service';

// ─── POST /api/auth/register ────────────────────────────────
export async function register(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await authService.registerUser(req.body);
    sendSuccess(res, user, 'User registered successfully', 201);
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── POST /api/auth/login ───────────────────────────────────
export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await authService.loginUser(req.body);
    sendSuccess(res, result, 'Login successful');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── GET /api/auth/me ───────────────────────────────────────
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401);
      return;
    }
    const profile = await authService.getUserProfile(req.user.id);
    sendSuccess(res, profile, 'Profile fetched');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── PUT /api/auth/change-password ──────────────────────────
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401);
      return;
    }
    const result = await authService.changePassword(req.user.id, req.body);
    sendSuccess(res, result, 'Password changed successfully');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}

// ─── POST /api/auth/refresh ─────────────────────────────────
export async function refreshToken(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshAccessToken(refreshToken);
    sendSuccess(res, tokens, 'Token refreshed');
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    sendError(res, err.message, err.statusCode || 500);
  }
}
