import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import { CreatePaymentInput, PaymentQuery } from './payments.schema';

// ─── DB Row Types ───────────────────────────────────────────

interface PaymentRow {
  id: string;
  worker_id: string;
  amount: string;
  method: string;
  reference: string | null;
  payment_date: Date;
  paid_by_id: string;
  remarks: string | null;
  created_at: Date;
}

interface CountRow {
  count: string;
}

interface BalanceRow {
  worker_id: string;
  worker_name: string;
  worker_code: string;
  total_earned: string;
  total_paid: string;
  balance: string;
}

// ─── Record Payment ─────────────────────────────────────────

export async function createPayment(input: CreatePaymentInput, paidById: string) {
  const { workerId, amount, method, reference, paymentDate, remarks } = input;

  // Verify worker exists
  const worker = await query<{ id: string; name: string }>(
    'SELECT id, name FROM workers WHERE id = ?',
    [workerId]
  );

  if (worker.rows.length === 0) {
    throw Object.assign(new Error('Worker not found'), { statusCode: 404 });
  }

  const paymentId = uuidv4();
  await query(
    `INSERT INTO payments (id, worker_id, amount, method, reference, payment_date, paid_by_id, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [paymentId, workerId, amount, method, reference || null, paymentDate, paidById, remarks || null]
  );

  const result = await query<PaymentRow>('SELECT * FROM payments WHERE id = ?', [paymentId]);

  return {
    ...result.rows[0],
    worker_name: worker.rows[0].name,
  };
}

// ─── Get Payments (Paginated & Filtered) ────────────────────

export async function getPayments(filters: PaymentQuery) {
  const { page, limit, workerId, method, startDate, endDate, sortBy, sortOrder } = filters;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (workerId) {
    conditions.push(`p.worker_id = ?`);
    params.push(workerId);
  }

  if (method) {
    conditions.push(`p.method = ?`);
    params.push(method);
  }

  if (startDate) {
    conditions.push(`p.payment_date >= ?`);
    params.push(startDate);
  }

  if (endDate) {
    conditions.push(`p.payment_date <= ?`);
    params.push(endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortColumns: Record<string, string> = {
    payment_date: 'p.payment_date',
    amount: 'p.amount',
    created_at: 'p.created_at',
  };
  const sortCol = sortColumns[sortBy] || 'p.payment_date';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Count
  const countResult = await query<CountRow>(
    `SELECT COUNT(*) AS count FROM payments p ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Fetch
  const dataResult = await query<PaymentRow>(
    `SELECT p.*,
            w.name AS worker_name, w.worker_id AS worker_code,
            u.name AS paid_by_name
     FROM payments p
     JOIN workers w ON p.worker_id = w.id
     LEFT JOIN users u ON p.paid_by_id = u.id
     ${whereClause}
     ORDER BY ${sortCol} ${order}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    payments: dataResult.rows,
    total,
    page,
    limit,
  };
}

// ─── Get Single Payment ─────────────────────────────────────

export async function getPaymentById(id: string) {
  const result = await query<PaymentRow>(
    `SELECT p.*,
            w.name AS worker_name, w.worker_id AS worker_code,
            u.name AS paid_by_name
     FROM payments p
     JOIN workers w ON p.worker_id = w.id
     LEFT JOIN users u ON p.paid_by_id = u.id
     WHERE p.id = ?`,
    [id]
  );

  if (result.rows.length === 0) {
    throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  }

  return result.rows[0];
}

// ─── Get Worker Payment History + Balance ───────────────────

export async function getWorkerPayments(workerId: string, startDate?: string, endDate?: string) {
  const dateConditions: string[] = [];
  const dateParams: unknown[] = [];
  if (startDate) {
    dateConditions.push(`payment_date >= ?`);
    dateParams.push(startDate);
  }
  if (endDate) {
    dateConditions.push(`payment_date <= ?`);
    dateParams.push(endDate);
  }

  const paymentDateFilter = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

  // Payment history
  const payments = await query<PaymentRow>(
    `SELECT p.*, u.name AS paid_by_name
     FROM payments p
     LEFT JOIN users u ON p.paid_by_id = u.id
     WHERE p.worker_id = ? ${paymentDateFilter}
     ORDER BY p.payment_date DESC`,
    [workerId, ...dateParams]
  );

  // Total earned (all time)
  const earned = await query<{ total: string }>(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM work_entries WHERE worker_id = ?',
    [workerId]
  );

  // Total paid (all time)
  const paid = await query<{ total: string }>(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE worker_id = ?',
    [workerId]
  );

  const totalEarned = parseFloat(earned.rows[0].total);
  const totalPaid = parseFloat(paid.rows[0].total);

  return {
    workerId,
    totalEarned,
    totalPaid,
    balance: parseFloat((totalEarned - totalPaid).toFixed(2)),
    payments: payments.rows,
  };
}

// ─── Get Pending Payments (All Workers) ─────────────────────

export async function getPendingPayments() {
  const result = await query<BalanceRow>(
    `SELECT
       w.id AS worker_id,
       w.name AS worker_name,
       w.worker_id AS worker_code,
       COALESCE(earned.total, 0) AS total_earned,
       COALESCE(paid.total, 0) AS total_paid,
       COALESCE(earned.total, 0) - COALESCE(paid.total, 0) AS balance
     FROM workers w
     LEFT JOIN (
       SELECT worker_id, SUM(amount) AS total
       FROM work_entries GROUP BY worker_id
     ) earned ON earned.worker_id = w.id
     LEFT JOIN (
       SELECT worker_id, SUM(amount) AS total
       FROM payments GROUP BY worker_id
     ) paid ON paid.worker_id = w.id
     WHERE w.status = 'ACTIVE'
       AND (COALESCE(earned.total, 0) - COALESCE(paid.total, 0)) > 0
     ORDER BY balance DESC`
  );

  const totalPending = result.rows.reduce(
    (sum, r) => sum + parseFloat(r.balance as string),
    0
  );

  return {
    totalPending: parseFloat(totalPending.toFixed(2)),
    workersWithBalance: result.rows.length,
    workers: result.rows,
  };
}

// ─── Delete Payment ─────────────────────────────────────────

export async function deletePayment(id: string) {
  const result = await query<PaymentRow>('SELECT * FROM payments WHERE id = ?', [id]);
  if (result.rows.length === 0) {
    throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  }

  await query('DELETE FROM payments WHERE id = ?', [id]);
  return result.rows[0];
}
