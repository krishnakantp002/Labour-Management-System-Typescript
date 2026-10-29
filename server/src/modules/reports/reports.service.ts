import { query } from '../../config/database';

export class ReportsService {
  /**
   * Get worker-wise summary (work, earnings, attendance) over a date range
   */
  static async getWorkerSummary(startDate: string, endDate: string) {
    try {
      // Aggregating attendance, work, and payments per worker
      const sqlQuery = `
        SELECT 
          w.id,
          w.worker_id,
          w.name,
          w.status,
          COALESCE(att.present_count, 0) as days_present,
          COALESCE(work_sum.total_tons, 0) as total_tons,
          COALESCE(work_sum.total_earned, 0) as total_earned,
          COALESCE(pay_sum.total_paid, 0) as total_paid
        FROM workers w
        LEFT JOIN (
          SELECT worker_id, COUNT(*) as present_count
          FROM attendance
          WHERE status = 'PRESENT' AND date >= ? AND date <= ?
          GROUP BY worker_id
        ) att ON w.id = att.worker_id
        LEFT JOIN (
          SELECT worker_id, SUM(quantity_tons) as total_tons, SUM(amount) as total_earned
          FROM work_entries
          WHERE work_date >= ? AND work_date <= ?
          GROUP BY worker_id
        ) work_sum ON w.id = work_sum.worker_id
        LEFT JOIN (
          SELECT worker_id, SUM(amount) as total_paid
          FROM payments
          WHERE payment_date >= ? AND payment_date <= ?
          GROUP BY worker_id
        ) pay_sum ON w.id = pay_sum.worker_id
        ORDER BY w.name ASC
      `;
      const result = await query<any>(sqlQuery, [startDate, endDate, startDate, endDate, startDate, endDate]);
      
      // Calculate pending balance
      return result.rows.map((row) => ({
        ...row,
        days_present: parseInt(row.days_present || '0', 10),
        total_tons: parseFloat(row.total_tons || '0'),
        total_earned: parseFloat(row.total_earned || '0'),
        total_paid: parseFloat(row.total_paid || '0'),
        pending_balance: parseFloat(row.total_earned || '0') - parseFloat(row.total_paid || '0')
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get detailed attendance report
   */
  static async getAttendanceReport(startDate: string, endDate: string) {
    try {
      const sqlQuery = `
        SELECT a.date, a.status, a.check_in, a.check_out, w.worker_id, w.name as worker_name
        FROM attendance a
        JOIN workers w ON a.worker_id = w.id
        WHERE a.date >= ? AND a.date <= ?
        ORDER BY a.date DESC, w.name ASC
      `;
      const result = await query<any>(sqlQuery, [startDate, endDate]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get rate change history
   */
  static async getRateHistory() {
    try {
      const sqlQuery = `
        SELECT r.rate_per_ton, r.effective_from, r.created_at, p.name as product_name, u.name as changed_by
        FROM rates r
        JOIN products p ON r.product_id = p.id
        JOIN users u ON r.changed_by_id = u.id
        ORDER BY r.effective_from DESC, p.name ASC
      `;
      const result = await query<any>(sqlQuery);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}
