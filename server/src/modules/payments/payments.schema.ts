import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// ─── Record Payment ─────────────────────────────────────────
export const createPaymentSchema = z.object({
  workerId: z.string().uuid('Invalid worker ID'),
  amount: z.number().positive('Amount must be positive').multipleOf(0.01),
  method: z.enum(['CASH', 'UPI', 'BANK']),
  reference: z.string().max(255).optional(),
  paymentDate: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD format'),
  remarks: z.string().max(500).optional(),
});

// ─── Query Payments ─────────────────────────────────────────
export const paymentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  workerId: z.string().uuid().optional(),
  method: z.enum(['CASH', 'UPI', 'BANK']).optional(),
  startDate: z.string().regex(dateRegex).optional(),
  endDate: z.string().regex(dateRegex).optional(),
  sortBy: z.enum(['payment_date', 'amount', 'created_at']).default('payment_date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Inferred Types ─────────────────────────────────────────
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;
