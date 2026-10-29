import { z } from 'zod';

// ─── Create Worker ──────────────────────────────────────────
export const createWorkerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  phone: z.string().max(20).optional(),
  remarks: z.string().max(500).optional(),
});

// ─── Update Worker ──────────────────────────────────────────
export const updateWorkerSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().max(20).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  remarks: z.string().max(500).nullable().optional(),
});

// ─── Toggle Status ──────────────────────────────────────────
export const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

// ─── List Workers Query ─────────────────────────────────────
export const listWorkersQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  sortBy: z.enum(['name', 'worker_id', 'created_at', 'status']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Inferred Types ─────────────────────────────────────────
export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListWorkersQuery = z.infer<typeof listWorkersQuery>;
