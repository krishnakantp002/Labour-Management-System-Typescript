import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../../config/database';
import {
  MarkAttendanceInput,
  BulkAttendanceInput,
  UpdateAttendanceInput,
  AttendanceQuery,
} from './attendance.schema';

interface AttendanceRow {
  id: string;
  worker_id: string;
  date: Date;
  status: string;
  check_in: Date | null;
  check_out: Date | null;
  marked_by_id: string;
  created_at: Date;
}

interface CountRow {
  count: string;
}

interface SummaryRow {
  total_workers: string;
  present: string;
  absent: string;
  not_marked: string;
}

export async function markAttendance(input: MarkAttendanceInput, markedById: string) {
  const { workerId, date, status, checkIn, checkOut } = input;
  const id = uuidv4();
  
  await query(
    `INSERT INTO attendance (id, worker_id, date, status, check_in, check_out, marked_by_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       check_in = VALUES(check_in),
       check_out = VALUES(check_out),
       marked_by_id = VALUES(marked_by_id)`,
    [id, workerId, date, status, checkIn || null, checkOut || null, markedById]
  );

  const result = await query<AttendanceRow>('SELECT * FROM attendance WHERE worker_id = ? AND date = ?', [workerId, date]);
  return result.rows[0];
}

export async function bulkMarkAttendance(input: BulkAttendanceInput, markedById: string) {
  const { date, entries } = input;

  const results = await transaction(async (client: any) => {
    const marked = [];

    for (const entry of entries) {
      const id = uuidv4();
      await client.query(
        `INSERT INTO attendance (id, worker_id, date, status, check_in, check_out, marked_by_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           check_in = VALUES(check_in),
           check_out = VALUES(check_out),
           marked_by_id = VALUES(marked_by_id)`,
        [id, entry.workerId, date, entry.status, entry.checkIn || null, entry.checkOut || null, markedById]
      );
      
      const [rows] = await client.query('SELECT * FROM attendance WHERE worker_id = ? AND date = ?', [entry.workerId, date]);
      marked.push(rows[0]);
    }

    return marked;
  });

  return {
    date,
    totalMarked: results.length,
    entries: results,
  };
}

export async function getAttendance(filters: AttendanceQuery) {
  const { page, limit, date, workerId, startDate, endDate, status } = filters;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (date) {
    conditions.push(`a.date = ?`);
    params.push(date);
  }

  if (workerId) {
    conditions.push(`a.worker_id = ?`);
    params.push(workerId);
  }

  if (startDate) {
    conditions.push(`a.date >= ?`);
    params.push(startDate);
  }

  if (endDate) {
    conditions.push(`a.date <= ?`);
    params.push(endDate);
  }

  if (status) {
    conditions.push(`a.status = ?`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<CountRow>(
    `SELECT COUNT(*) AS count FROM attendance a ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await query<AttendanceRow>(
    `SELECT a.*, w.name AS worker_name, w.worker_id AS worker_code, u.name AS marked_by_name
     FROM attendance a
     JOIN workers w ON a.worker_id = w.id
     LEFT JOIN users u ON a.marked_by_id = u.id
     ${whereClause}
     ORDER BY a.date DESC, w.name ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    attendance: dataResult.rows,
    total,
    page,
    limit,
  };
}

export async function getTodaySummary() {
  const today = new Date().toISOString().split('T')[0];

  const result = await query<SummaryRow>(
    `SELECT
       (SELECT COUNT(*) FROM workers WHERE status = 'ACTIVE') AS total_workers,
       COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) AS present,
       COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) AS absent,
       (SELECT COUNT(*) FROM workers WHERE status = 'ACTIVE') - COUNT(a.id) AS not_marked
     FROM attendance a
     WHERE a.date = ?
       AND a.worker_id IN (SELECT id FROM workers WHERE status = 'ACTIVE')`,
    [today]
  );

  const summary = result.rows[0];

  const presentWorkers = await query<AttendanceRow>(
    `SELECT a.*, w.name AS worker_name, w.worker_id AS worker_code
     FROM attendance a
     JOIN workers w ON a.worker_id = w.id
     WHERE a.date = ? AND a.status = 'PRESENT'
     ORDER BY w.name ASC`,
    [today]
  );

  return {
    date: today,
    totalWorkers: parseInt(summary.total_workers, 10),
    present: parseInt(summary.present, 10),
    absent: parseInt(summary.absent, 10),
    notMarked: parseInt(summary.not_marked, 10),
    presentWorkers: presentWorkers.rows,
  };
}

export async function updateAttendance(id: string, input: UpdateAttendanceInput) {
  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (input.status !== undefined) {
    setClauses.push(`status = ?`);
    params.push(input.status);
  }

  if (input.checkIn !== undefined) {
    setClauses.push(`check_in = ?`);
    params.push(input.checkIn);
  }

  if (input.checkOut !== undefined) {
    setClauses.push(`check_out = ?`);
    params.push(input.checkOut);
  }

  if (setClauses.length === 0) {
    throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  }

  await query(
    `UPDATE attendance SET ${setClauses.join(', ')} WHERE id = ?`,
    [...params, id]
  );

  const result = await query<AttendanceRow>('SELECT * FROM attendance WHERE id = ?', [id]);
  if (result.rows.length === 0) {
    throw Object.assign(new Error('Attendance record not found'), { statusCode: 404 });
  }

  return result.rows[0];
}

export async function getWorkerAttendance(workerId: string, month?: string) {
  let dateFilter = '';
  const params: unknown[] = [workerId];

  if (month) {
    dateFilter = `AND DATE_FORMAT(a.date, '%Y-%m') = ?`;
    params.push(month);
  }

  const result = await query<AttendanceRow>(
    `SELECT a.*, u.name AS marked_by_name
     FROM attendance a
     LEFT JOIN users u ON a.marked_by_id = u.id
     WHERE a.worker_id = ? ${dateFilter}
     ORDER BY a.date DESC`,
    params
  );

  const total = result.rows.length;
  const present = result.rows.filter((r) => r.status === 'PRESENT').length;
  const absent = result.rows.filter((r) => r.status === 'ABSENT').length;

  return {
    workerId,
    summary: { total, present, absent },
    records: result.rows,
  };
}
