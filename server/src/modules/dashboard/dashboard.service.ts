import { query } from '../../config/database';

export class DashboardService {
  /**
   * Get dashboard statistics (Admin/Manager)
   */
  static async getStats() {
    try {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      const today = d.toISOString().split('T')[0];

      const attendanceResult = await query<{ status: string, count: string }>(`
        SELECT status, COUNT(*) as count 
        FROM attendance 
        WHERE date = ?
        GROUP BY status
      `, [today]);
      
      const attendance = {
        present: 0,
        absent: 0
      };
      
      attendanceResult.rows.forEach((row) => {
        if (row.status === 'PRESENT') attendance.present = parseInt(row.count, 10);
        if (row.status === 'ABSENT') attendance.absent = parseInt(row.count, 10);
      });

      const workResult = await query<{ total_tons: string, total_amount: string }>(`
        SELECT 
          COALESCE(SUM(quantity_tons), 0) as total_tons,
          COALESCE(SUM(amount), 0) as total_amount
        FROM work_entries
        WHERE work_date = ?
      `, [today]);

      const work = {
        totalTons: parseFloat(workResult.rows[0]?.total_tons || '0'),
        totalAmount: parseFloat(workResult.rows[0]?.total_amount || '0')
      };

      const totalEarnedResult = await query<{ total: string }>(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM work_entries
      `);
      const totalPaidResult = await query<{ total: string }>(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
      `);
      
      const totalEarned = parseFloat(totalEarnedResult.rows[0]?.total || '0');
      const totalPaid = parseFloat(totalPaidResult.rows[0]?.total || '0');
      const pendingPayments = totalEarned - totalPaid;

      const recentWorkResult = await query<any>(`
        SELECT 
          w_e.id, 
          w_e.quantity_tons, 
          w_e.amount, 
          w_e.created_at, 
          p.name as product_name, 
          w.name as worker_name,
          w.worker_id as worker_code
        FROM work_entries w_e
        JOIN products p ON w_e.product_id = p.id
        JOIN workers w ON w_e.worker_id = w.id
        ORDER BY w_e.created_at DESC
        LIMIT 5
      `);

      return {
        attendance,
        work,
        pendingPayments,
        recentWork: recentWorkResult.rows
      };

    } catch (error) {
      throw error;
    }
  }
}
