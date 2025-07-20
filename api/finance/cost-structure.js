import { getDb } from '../_lib/db.js';
import { getDateRange, calculatePercentage } from '../_lib/helpers.js';
import '../_lib/init-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    const { period = 'current-month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Fixed vs Variable costs
    const costStructure = await db.allAsync(`
      SELECT 
        CASE 
          WHEN is_fixed_cost = 1 THEN 'Fixed Costs'
          ELSE 'Variable Costs'
        END as cost_type,
        account_subtype,
        SUM(amount) as total_amount
      FROM financial_transactions
      WHERE transaction_date BETWEEN ? AND ?
        AND account_type IN ('cogs', 'expense')
      GROUP BY is_fixed_cost, account_subtype
      ORDER BY is_fixed_cost DESC, total_amount DESC
    `, [startDate, endDate]);

    // Summary
    const costSummary = await db.getAsync(`
      SELECT 
        SUM(CASE WHEN is_fixed_cost = 1 THEN amount ELSE 0 END) as fixed_costs,
        SUM(CASE WHEN is_fixed_cost = 0 THEN amount ELSE 0 END) as variable_costs,
        SUM(amount) as total_costs
      FROM financial_transactions
      WHERE transaction_date BETWEEN ? AND ?
        AND account_type IN ('cogs', 'expense')
    `, [startDate, endDate]);

    // Monthly trend
    const monthlyStructure = await db.allAsync(`
      SELECT 
        strftime('%Y-%m', transaction_date) as month,
        SUM(CASE WHEN is_fixed_cost = 1 THEN amount ELSE 0 END) as fixed_costs,
        SUM(CASE WHEN is_fixed_cost = 0 THEN amount ELSE 0 END) as variable_costs
      FROM financial_transactions
      WHERE transaction_date >= date('now', '-12 months')
        AND account_type IN ('cogs', 'expense')
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month
    `);

    res.status(200).json({
      costBreakdown: costStructure,
      summary: {
        fixed_costs: costSummary.fixed_costs || 0,
        variable_costs: costSummary.variable_costs || 0,
        total_costs: costSummary.total_costs || 0,
        fixed_percentage: calculatePercentage(costSummary.fixed_costs, costSummary.total_costs),
        variable_percentage: calculatePercentage(costSummary.variable_costs, costSummary.total_costs)
      },
      trend: monthlyStructure,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getCostStructure:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}