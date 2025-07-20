import { getDb } from '../_lib/db.js';
import { getDateRange } from '../_lib/helpers.js';
import '../_lib/init-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    const { period = 'current-month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Department P&L
    const deptPL = await db.allAsync(`
      SELECT 
        d.code,
        d.name,
        d.cost_center,
        SUM(CASE WHEN ft.account_type = 'revenue' THEN ft.amount ELSE 0 END) as revenue,
        SUM(CASE WHEN ft.account_type IN ('cogs', 'expense') THEN ft.amount ELSE 0 END) as costs,
        SUM(CASE WHEN ft.account_type = 'revenue' THEN ft.amount ELSE -ft.amount END) as contribution
      FROM departments d
      LEFT JOIN financial_transactions ft ON d.id = ft.department_id
        AND ft.transaction_date BETWEEN ? AND ?
      GROUP BY d.id, d.code, d.name, d.cost_center
      ORDER BY contribution DESC
    `, [startDate, endDate]);

    // Cost breakdown by department
    const deptCostBreakdown = await db.allAsync(`
      SELECT 
        d.name as department,
        ft.account_subtype,
        SUM(ft.amount) as amount
      FROM financial_transactions ft
      JOIN departments d ON ft.department_id = d.id
      WHERE ft.transaction_date BETWEEN ? AND ?
        AND ft.account_type IN ('cogs', 'expense')
      GROUP BY d.id, d.name, ft.account_subtype
      ORDER BY d.name, amount DESC
    `, [startDate, endDate]);

    res.status(200).json({
      departmentPL: deptPL,
      costBreakdown: deptCostBreakdown,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getByDepartment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}