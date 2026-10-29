import { z } from 'zod';

// ─── Create Product ─────────────────────────────────────────
export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(255),
});

// ─── Update Product ─────────────────────────────────────────
export const updateProductSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  isActive: z.boolean().optional(),
});

// ─── Set Rate ───────────────────────────────────────────────
export const setRateSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  ratePerTon: z.number().positive('Rate must be a positive number'),
});

// ─── Query Rate History ─────────────────────────────────────
export const rateHistoryQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
  productId: z.string().uuid().optional(),
});

// ─── Inferred Types ─────────────────────────────────────────
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type SetRateInput = z.infer<typeof setRateSchema>;
export type RateHistoryQuery = z.infer<typeof rateHistoryQuery>;
