import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// ─── Mark Single Attendance ─────────────────────────────────
export const markAttendanceSchema = z.object({
  workerId: z.string().uuid('Invalid worker ID'),
  date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD format'),
  status: z.enum(['PRESENT', 'ABSENT']),
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
});

// ─── Bulk Attendance ────────────────────────────────────────
export const bulkAttendanceSchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD format'),
  entries: z.array(
    z.object({
      workerId: z.string().uuid('Invalid worker ID'),
      status: z.enum(['PRESENT', 'ABSENT']),
      checkIn: z.string().datetime().optional(),
      checkOut: z.string().datetime().optional(),
    })
  ).min(1, 'At least one attendance entry is required'),
});

// ─── Update Attendance ──────────────────────────────────────
export const updateAttendanceSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT']).optional(),
  checkIn: z.string().datetime().nullable().optional(),
  checkOut: z.string().datetime().nullable().optional(),
});

// ─── Query Attendance ───────────────────────────────────────
export const attendanceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  date: z.string().regex(dateRegex).optional(),
  workerId: z.string().uuid().optional(),
  startDate: z.string().regex(dateRegex).optional(),
  endDate: z.string().regex(dateRegex).optional(),
  status: z.enum(['PRESENT', 'ABSENT']).optional(),
});

// ─── Inferred Types ─────────────────────────────────────────
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>;
