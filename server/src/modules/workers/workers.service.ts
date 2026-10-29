import { query } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateWorkerInput,
  UpdateWorkerInput,
  UpdateStatusInput,
  ListWorkersQuery,
} from './workers.schema';

interface WorkerRow {
  id: string;
  worker_id: string;
  name: string;
  phone: string | null;
  photo_url: string | null;
  status: string;
  remarks: string | null;
  created_by_id: string;
  created_at: Date;
  updated_at: Date;
}

interface CountRow {
  count: string;
}

async function generateWorkerId(): Promise<string> {
  const result = await query<{ max_num: string | null }>(
    `SELECT MAX(CAST(SUBSTRING(worker_id, 5) AS UNSIGNED)) AS max_num FROM workers`
  );
  const maxNum = result.rows[0]?.max_num ? parseInt(result.rows[0].max_num, 10) : 0;
  const nextNum = maxNum + 1;
  return `WRK-${String(nextNum).padStart(3, '0')}`;
}

export async function createWorker(input: CreateWorkerInput, createdById: string) {
  const workerId = await generateWorkerId();
  const id = uuidv4();
  await query(
    `INSERT INTO workers (id, worker_id, name, phone, remarks, created_by_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, workerId, input.name, input.phone || null, input.remarks || null, createdById]
  );
  return getWorkerById(id);
}

export async function getWorkers(filters: ListWorkersQuery) {
  const { page, limit, search, status, sortBy, sortOrder } = filters;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    conditions.push(`(w.name LIKE ? OR w.worker_id LIKE ? OR w.phone LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    conditions.push(`w.status = ?`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSortColumns: Record<string, string> = {
    name: 'w.name',
    worker_id: 'w.worker_id',
    created_at: 'w.created_at',
    status: 'w.status',
  };
  const sortColumn = allowedSortColumns[sortBy] || 'w.created_at';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countResult = await query<CountRow>(
    `SELECT COUNT(*) AS count FROM workers w ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  const today = d.toISOString().split('T')[0];

  const dataResult = await query<WorkerRow & { today_attendance?: string, balance: string }>(
    `SELECT w.*, u.name AS created_by_name, a.status AS today_attendance,
            COALESCE(earned.total, 0) - COALESCE(paid.total, 0) AS balance
     FROM workers w
     LEFT JOIN users u ON w.created_by_id = u.id
     LEFT JOIN attendance a ON w.id = a.worker_id AND a.date = ?
     LEFT JOIN (
       SELECT worker_id, SUM(amount) AS total
       FROM work_entries GROUP BY worker_id
     ) earned ON earned.worker_id = w.id
     LEFT JOIN (
       SELECT worker_id, SUM(amount) AS total
       FROM payments GROUP BY worker_id
     ) paid ON paid.worker_id = w.id
     ${whereClause}
     ORDER BY ${sortColumn} ${order}
     LIMIT ? OFFSET ?`,
    [today, ...params, limit, offset]
  );

  return {
    workers: dataResult.rows,
    total,
    page,
    limit,
  };
}

export async function getWorkerById(id: string) {
  const result = await query<WorkerRow>(
    `SELECT w.*, u.name AS created_by_name
     FROM workers w
     LEFT JOIN users u ON w.created_by_id = u.id
     WHERE w.id = ?`,
    [id]
  );
  if (result.rows.length === 0) {
    throw Object.assign(new Error('Worker not found'), { statusCode: 404 });
  }
  return result.rows[0];
}

export async function updateWorker(id: string, input: UpdateWorkerInput) {
  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (input.name !== undefined) {
    setClauses.push(`name = ?`);
    params.push(input.name);
  }
  if (input.phone !== undefined) {
    setClauses.push(`phone = ?`);
    params.push(input.phone);
  }
  if (input.photoUrl !== undefined) {
    setClauses.push(`photo_url = ?`);
    params.push(input.photoUrl);
  }
  if (input.remarks !== undefined) {
    setClauses.push(`remarks = ?`);
    params.push(input.remarks);
  }

  if (setClauses.length === 0) {
    throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  }

  await query(
    `UPDATE workers SET ${setClauses.join(', ')} WHERE id = ?`,
    [...params, id]
  );
  return getWorkerById(id);
}

export async function updateWorkerStatus(id: string, input: UpdateStatusInput) {
  await query(
    `UPDATE workers SET status = ? WHERE id = ?`,
    [input.status, id]
  );
  return getWorkerById(id);
}

export async function deleteWorker(id: string) {
  const workEntries = await query<CountRow>(
    'SELECT COUNT(*) AS count FROM work_entries WHERE worker_id = ?',
    [id]
  );
  if (parseInt(workEntries.rows[0].count, 10) > 0) {
    throw Object.assign(
      new Error('Cannot delete worker with existing work records. Deactivate instead.'),
      { statusCode: 400 }
    );
  }

  const worker = await getWorkerById(id);
  await query('DELETE FROM workers WHERE id = ?', [id]);
  return worker;
}
