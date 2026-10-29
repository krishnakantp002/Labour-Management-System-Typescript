import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { query } from '../../config/database';
import logger from '../../utils/logger';

/**
 * Activity Audit Log
 *
 * Automatically records every state-changing request (POST/PUT/PATCH/DELETE)
 * so the admin can review ALL alterations: who made them, when, from where
 * and what changed.
 */

const SECRET_KEYS = ['password', 'currentPassword', 'newPassword', 'refreshToken', 'password_hash'];

interface AuditRule {
  method: string;
  pattern: RegExp;
  action: string;
  entity: string;
}

// Maps METHOD + route → friendly action shown in the admin log
const RULES: AuditRule[] = [
  // Workers
  { method: 'POST',   pattern: /^\/api\/workers\/?$/,                  action: 'Created Worker',          entity: 'WORKER' },
  { method: 'PUT',    pattern: /^\/api\/workers\/[^/]+$/,              action: 'Updated Worker',          entity: 'WORKER' },
  { method: 'PATCH',  pattern: /^\/api\/workers\/[^/]+\/status$/,      action: 'Changed Worker Status',   entity: 'WORKER' },
  { method: 'DELETE', pattern: /^\/api\/workers\/[^/]+$/,              action: 'Deleted Worker',          entity: 'WORKER' },
  // Products & Rates
  { method: 'POST',   pattern: /^\/api\/rates\/products\/?$/,          action: 'Created Product',         entity: 'PRODUCT' },
  { method: 'PUT',    pattern: /^\/api\/rates\/products\/[^/]+$/,      action: 'Updated Product',         entity: 'PRODUCT' },
  { method: 'DELETE', pattern: /^\/api\/rates\/products\/[^/]+$/,      action: 'Deleted Product',         entity: 'PRODUCT' },
  { method: 'POST',   pattern: /^\/api\/rates\/?$/,                    action: 'Changed Product Rate',    entity: 'RATE' },
  // Work entries
  { method: 'POST',   pattern: /^\/api\/work\/bulk$/,                  action: 'Recorded Bulk Work Entries', entity: 'WORK_ENTRY' },
  { method: 'POST',   pattern: /^\/api\/work\/?$/,                     action: 'Recorded Work Entry',     entity: 'WORK_ENTRY' },
  { method: 'DELETE', pattern: /^\/api\/work\/[^/]+$/,                 action: 'Deleted Work Entry',      entity: 'WORK_ENTRY' },
  // Attendance
  { method: 'POST',   pattern: /^\/api\/attendance\/bulk$/,            action: 'Marked Bulk Attendance',  entity: 'ATTENDANCE' },
  { method: 'POST',   pattern: /^\/api\/attendance\/?$/,               action: 'Marked Attendance',       entity: 'ATTENDANCE' },
  { method: 'PUT',    pattern: /^\/api\/attendance\/[^/]+$/,           action: 'Updated Attendance',      entity: 'ATTENDANCE' },
  // Payments
  { method: 'POST',   pattern: /^\/api\/payments\/?$/,                 action: 'Recorded Payment',        entity: 'PAYMENT' },
  { method: 'DELETE', pattern: /^\/api\/payments\/[^/]+$/,             action: 'Deleted Payment',         entity: 'PAYMENT' },
  // Auth / User accounts
  { method: 'POST',   pattern: /^\/api\/auth\/register$/,              action: 'Created User Account',    entity: 'USER' },
  { method: 'PATCH',  pattern: /^\/api\/auth\/users\/[^/]+\/status$/,  action: 'Changed User Status',     entity: 'USER' },
  { method: 'POST',   pattern: /^\/api\/auth\/login$/,                 action: 'Signed In',               entity: 'AUTH' },
];

// Resolve record IDs in the payload into human-readable names so the
// admin log shows "Worker: Ramesh" instead of a bare UUID.
async function enrichDetails(match: AuditRule, body: any): Promise<Record<string, unknown> | null> {
  // Login payloads carry nothing useful — the Person column shows the email
  if (match.action === 'Signed In') return null;
  if (!body || typeof body !== 'object') return body ?? null;

  let enriched: Record<string, unknown> = { ...body };
  const lookups: Array<Promise<void>> = [];

  const replaceId = async (key: string, table: string, nameColumn: string, nameField: string) => {
    const raw = enriched[key];
    if (typeof raw === 'string' && isUuidPattern.test(raw)) {
      try {
        const result = await query<{ name: string }>(
          `SELECT ${nameColumn} AS name FROM ${table} WHERE id = ?`,
          [raw]
        );
        if (result.rows.length > 0) {
          enriched[nameField] = result.rows[0].name;
        }
        // Never show a bare UUID in the admin log — remove the id either way
        delete enriched[key];
      } catch {
        delete enriched[key];
      }
    }
  };

  const isUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (typeof enriched.workerId === 'string') {
    lookups.push(replaceId('workerId', 'workers', 'name', 'workerName'));
  }
  if (typeof enriched.productId === 'string') {
    lookups.push(replaceId('productId', 'products', 'name', 'productName'));
  }

  if (lookups.length > 0) {
    await Promise.all(lookups);
  }

  // For bulk entries, keep details readable — just a count, no raw ids
  if (Array.isArray(enriched.entries) && enriched.entries.length > 0) {
    enriched = { ...enriched, entries: `${enriched.entries.length} entries` };
  }

  return enriched;
}

function sanitizeDetails(body: any): string | null {
  try {
    if (!body || Object.keys(body).length === 0) return null;

    let sanitized: any = body;

    // Bulk payloads: don't dump everything, keep a readable summary
    if (Array.isArray(body.entries) && body.entries.length > 1) {
      sanitized = { ...body, entries: `[${body.entries.length} records]` };
    } else if (Array.isArray(body.workers) && body.workers.length > 1) {
      sanitized = { ...body, workers: `[${body.workers.length} records]` };
    }

    // Strip secrets anywhere in one or two levels of nesting
    sanitized = JSON.parse(JSON.stringify(sanitized, (key, value) => {
      if (SECRET_KEYS.includes(key)) return '[redacted]';
      return value;
    }));

    let jsonStr = JSON.stringify(sanitized);
    if (jsonStr.length > 2000) jsonStr = jsonStr.slice(0, 2000) + '…[truncated]';
    return jsonStr;
  } catch {
    return '[unreadable payload]';
  }
}

export async function auditMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // For sign-ins, capture the response body so we can log the real account
  // (the login route is public — req.user isn't set on the request itself).
  let loginResponse: any = null;
  if (req.method === 'POST' && /^\/api\/auth\/login\/?$/.test(req.originalUrl.split('?')[0])) {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      loginResponse = body;
      return originalJson(body);
    };
  }

  // Compute AFTER the route handler finishes, so we know the status code
  res.on('finish', () => {
    try {
      const matched = RULES.find(
        (r) => r.method === req.method && r.pattern.test(req.originalUrl.split('?')[0])
      );
      if (!matched) return;
      // Only record alterations that actually succeeded or were rejected client-side
      if (res.statusCode >= 500) return; // server errors — nothing was altered

      let actorId: string | null = null;
      let actorName: string = req.body?.email || 'Attempt';
      let actorRole: string = 'UNAUTHENTICATED';
      let detailsBody: unknown = req.body;

      const user = (req as AuthRequest).user;
      if (user) {
        actorId = user.id;
        // The JWT payload carries email, not name — the human name is resolved
        // from the users table when the log is read (see logs.controller).
        actorName = user.email;
        actorRole = user.role;
      } else if (matched.action === 'Signed In' && res.statusCode < 400 && loginResponse?.data?.user) {
        // Successful sign-in — the response carries the authenticated account
        actorId = loginResponse.data.user.id;
        actorName = loginResponse.data.user.email;
        actorRole = loginResponse.data.user.role;
        detailsBody = null; // email is already shown in the Person column
      }

      // Fire-and-forget — logging must never break the real request
      (async () => {
        try {
          const enriched = await enrichDetails(matched, detailsBody);
          await query(
            `INSERT INTO activity_logs
               (actor_id, actor_name, actor_role, action, entity_type, method, route, status_code, ip, details)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              actorId,
              actorName,
              actorRole,
              matched.action,
              matched.entity,
              req.method,
              req.originalUrl.split('?')[0],
              res.statusCode,
              (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null,
              sanitizeDetails(enriched),
            ]
          );
        } catch (err) {
          logger.error(`Audit log failed: ${(err as Error).message}`);
        }
      })();
    } catch (err) {
      logger.error(`Audit log failed: ${(err as Error).message}`);
    }
  });

  next();
}
