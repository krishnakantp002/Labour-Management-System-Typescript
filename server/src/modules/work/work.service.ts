import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../../config/database';
import {
  CreateWorkEntryInput,
  BulkWorkEntryInput,
  WorkEntryQuery,
} from './work.schema';

interface WorkEntryRow {
  id: string;
  worker_id: string;
  product_id: string;
  quantity_tons: string;
  rate_used: string;
  amount: string;
  work_date: Date;
  recorded_by_id: string;
  created_at: Date;
}

interface RateRow {
  rate_per_ton: string;
}

interface CountRow {
  count: string;
}

interface DailySummaryRow {
  total_entries: string;
  total_tons: string;
  total_amount: string;
  unique_workers: string;
}

async function getCurrentRate(productId: string): Promise<number> {
  const result = await query<RateRow>(
    `SELECT rate_per_ton FROM rates
     WHERE product_id = ?
     ORDER BY effective_from DESC
     LIMIT 1`,
    [productId]
  );

  if (result.rows.length === 0) {
    throw Object.assign(
      new Error('No rate set for this product. Set a rate first.'),
      { statusCode: 400 }
    );
  }

  return parseFloat(result.rows[0].rate_per_ton);
}

export async function createWorkEntry(input: CreateWorkEntryInput, recordedById: string) {
  const { workerId, productId, quantityTons, workDate } = input;
  const rateUsed = await getCurrentRate(productId);
  const amount = parseFloat((quantityTons * rateUsed).toFixed(2));
  const id = uuidv4();

  await query(
    `INSERT INTO work_entries (id, worker_id, product_id, quantity_tons, rate_used, amount, work_date, recorded_by_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, workerId, productId, quantityTons, rateUsed, amount, workDate, recordedById]
  );

  const result = await query<WorkEntryRow>('SELECT * FROM work_entries WHERE id = ?', [id]);
  return result.rows[0];
}

export async function bulkCreateWorkEntries(input: BulkWorkEntryInput, recordedById: string) {
  const { workDate, entries } = input;

  const uniqueProductIds = [...new Set(entries.map((e) => e.productId))];
  const rateMap = new Map<string, number>();

  for (const productId of uniqueProductIds) {
    rateMap.set(productId, await getCurrentRate(productId));
  }

  const results = await transaction(async (client: any) => {
    const created = [];

    for (const entry of entries) {
      const rateUsed = rateMap.get(entry.productId)!;
      const amount = parseFloat((entry.quantityTons * rateUsed).toFixed(2));
      const id = uuidv4();

      await client.query(
        `INSERT INTO work_entries (id, worker_id, product_id, quantity_tons, rate_used, amount, work_date, recorded_by_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, entry.workerId, entry.productId, entry.quantityTons, rateUsed, amount, workDate, recordedById]
      );
      
      const [rows] = await client.query('SELECT * FROM work_entries WHERE id = ?', [id]);
      created.push(rows[0]);
    }

    return created;
  });

  const totalAmount = results.reduce(
    (sum, r) => sum + parseFloat(r.amount),
    0
  );

  return {
    workDate,
    totalEntries: results.length,
    totalAmount: totalAmount.toFixed(2),
    entries: results,
  };
}

export async function getWorkEntries(filters: WorkEntryQuery) {
  const { page, limit, workerId, productId, date, startDate, endDate, sortBy, sortOrder } = filters;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (workerId) {
    conditions.push(`we.worker_id = ?`);
    params.push(workerId);
  }

  if (productId) {
    conditions.push(`we.product_id = ?`);
    params.push(productId);
  }

  if (date) {
    conditions.push(`we.work_date = ?`);
    params.push(date);
  }

  if (startDate) {
    conditions.push(`we.work_date >= ?`);
    params.push(startDate);
  }

  if (endDate) {
    conditions.push(`we.work_date <= ?`);
    params.push(endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortColumns: Record<string, string> = {
    work_date: 'we.work_date',
    amount: 'we.amount',
    quantity_tons: 'we.quantity_tons',
    created_at: 'we.created_at',
  };
  const sortCol = sortColumns[sortBy] || 'we.work_date';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countResult = await query<CountRow>(
    `SELECT COUNT(*) AS count FROM work_entries we ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await query<WorkEntryRow>(
    `SELECT we.*,
            w.name AS worker_name, w.worker_id AS worker_code, w.worker_id AS worker_human_id,
            p.name AS product_name,
            we.rate_used AS rate_applied,
            we.amount AS total_amount,
            u.name AS recorded_by_name
     FROM work_entries we
     JOIN workers w ON we.worker_id = w.id
     JOIN products p ON we.product_id = p.id
     LEFT JOIN users u ON we.recorded_by_id = u.id
     ${whereClause}
     ORDER BY ${sortCol} ${order}, w.name ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    workEntries: dataResult.rows,
    total,
    page,
    limit,
  };
}

export async function getWorkEntryById(id: string) {
  const result = await query<WorkEntryRow>(
    `SELECT we.*,
            w.name AS worker_name, w.worker_id AS worker_code, w.worker_id AS worker_human_id,
            p.name AS product_name,
            we.rate_used AS rate_applied,
            we.amount AS total_amount,
            u.name AS recorded_by_name
     FROM work_entries we
     JOIN workers w ON we.worker_id = w.id
     JOIN products p ON we.product_id = p.id
     LEFT JOIN users u ON we.recorded_by_id = u.id
     WHERE we.id = ?`,
    [id]
  );

  if (result.rows.length === 0) {
    throw Object.assign(new Error('Work entry not found'), { statusCode: 404 });
  }

  return result.rows[0];
}

export async function getDailySummary(date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const summary = await query<DailySummaryRow>(
    `SELECT
       COUNT(*) AS total_entries,
       COALESCE(SUM(quantity_tons), 0) AS total_tons,
       COALESCE(SUM(amount), 0) AS total_amount,
       COUNT(DISTINCT worker_id) AS unique_workers
     FROM work_entries
     WHERE work_date = ?`,
    [targetDate]
  );

  const breakdown = await query<WorkEntryRow>(
    `SELECT w.name AS worker_name, w.worker_id AS worker_code, w.worker_id AS worker_human_id,
            p.name AS product_name,
            we.quantity_tons, we.rate_used AS rate_applied, we.amount AS total_amount
     FROM work_entries we
     JOIN workers w ON we.worker_id = w.id
     JOIN products p ON we.product_id = p.id
     WHERE we.work_date = ?
     ORDER BY w.name ASC`,
    [targetDate]
  );

  const s = summary.rows[0];
  return {
    date: targetDate,
    totalEntries: parseInt(s.total_entries, 10),
    totalTons: parseFloat(s.total_tons),
    totalAmount: parseFloat(s.total_amount),
    uniqueWorkers: parseInt(s.unique_workers, 10),
    entries: breakdown.rows,
  };
}

export async function getWorkerEarnings(workerId: string, startDate?: string, endDate?: string) {
  const conditions: string[] = ['we.worker_id = ?'];
  const params: unknown[] = [workerId];

  if (startDate) {
    conditions.push(`we.work_date >= ?`);
    params.push(startDate);
  }

  if (endDate) {
    conditions.push(`we.work_date <= ?`);
    params.push(endDate);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const summaryResult = await query<DailySummaryRow>(
    `SELECT
       COUNT(*) AS total_entries,
       COALESCE(SUM(quantity_tons), 0) AS total_tons,
       COALESCE(SUM(amount), 0) AS total_amount,
       COUNT(DISTINCT work_date) AS unique_workers
     FROM work_entries we
     ${whereClause}`,
    params
  );

  const entries = await query<WorkEntryRow>(
    `SELECT we.*, p.name AS product_name,
            we.rate_used AS rate_applied,
            we.amount AS total_amount
     FROM work_entries we
     JOIN products p ON we.product_id = p.id
     ${whereClause}
     ORDER BY we.work_date DESC`,
    params
  );

  const s = summaryResult.rows[0];
  return {
    workerId,
    totalEntries: parseInt(s.total_entries, 10),
    totalTons: parseFloat(s.total_tons),
    totalEarnings: parseFloat(s.total_amount),
    workingDays: parseInt(s.unique_workers, 10),
    entries: entries.rows,
  };
}

export async function deleteWorkEntry(id: string) {
  const result = await query<WorkEntryRow>('SELECT * FROM work_entries WHERE id = ?', [id]);
  if (result.rows.length === 0) {
    throw Object.assign(new Error('Work entry not found'), { statusCode: 404 });
  }

  await query('DELETE FROM work_entries WHERE id = ?', [id]);
  return result.rows[0];
}
