import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// ─── Create Work Entry ──────────────────────────────────────
export const createWorkEntrySchema = z.object({
  workerId: z.string().uuid('Invalid worker ID'),
  productId: z.string().uuid('Invalid product ID'),
  quantityTons: z.number().positive('Quantity must be positive'),
  workDate: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD format'),
});

// ─── Bulk Work Entry ────────────────────────────────────────
export const bulkWorkEntrySchema = z.object({
  workDate: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD format'),
  entries: z.array(
    z.object({
      workerId: z.string().uuid('Invalid worker ID'),
      productId: z.string().uuid('Invalid product ID'),
      quantityTons: z.number().positive('Quantity must be positive'),
    })
  ).min(1, 'At least one work entry is required'),
});

// ─── Query Work Entries ─────────────────────────────────────
export const workEntryQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  workerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  date: z.string().regex(dateRegex).optional(),
  startDate: z.string().regex(dateRegex).optional(),
  endDate: z.string().regex(dateRegex).optional(),
  sortBy: z.enum(['work_date', 'amount', 'quantity_tons', 'created_at']).default('work_date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Inferred Types ─────────────────────────────────────────
export type CreateWorkEntryInput = z.infer<typeof createWorkEntrySchema>;
export type BulkWorkEntryInput = z.infer<typeof bulkWorkEntrySchema>;
export type WorkEntryQuery = z.infer<typeof workEntryQuery>;
