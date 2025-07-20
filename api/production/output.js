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

    // Monthly production output
    const monthlyOutput = await db.allAsync(`
      SELECT 
        strftime('%Y-%m', po.actual_end_date) as month,
        COUNT(*) as order_count,
        SUM(po.planned_quantity) as planned_quantity,
        SUM(po.actual_quantity) as actual_quantity,
        AVG(po.yield_percentage) as avg_yield,
        SUM(CASE WHEN po.status = 'completed' THEN 1 ELSE 0 END) as completed_orders
      FROM production_orders po
      WHERE po.actual_end_date BETWEEN ? AND ?
      GROUP BY strftime('%Y-%m', po.actual_end_date)
      ORDER BY month
    `, [startDate, endDate]);

    // Current period summary
    const periodSummary = await db.getAsync(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(planned_quantity) as total_planned,
        SUM(actual_quantity) as total_actual,
        AVG(yield_percentage) as overall_yield,
        SUM(CASE WHEN actual_quantity >= planned_quantity THEN 1 ELSE 0 END) as on_target_orders
      FROM production_orders
      WHERE actual_end_date BETWEEN ? AND ?
        AND status = 'completed'
    `, [startDate, endDate]);

    // Product-wise output
    const productOutput = await db.allAsync(`
      SELECT 
        p.sku,
        p.name,
        p.category,
        COUNT(po.id) as production_runs,
        SUM(po.actual_quantity) as total_produced,
        AVG(po.yield_percentage) as avg_yield
      FROM production_orders po
      JOIN products p ON po.product_id = p.id
      WHERE po.actual_end_date BETWEEN ? AND ?
        AND po.status = 'completed'
      GROUP BY p.id, p.sku, p.name, p.category
      ORDER BY total_produced DESC
      LIMIT 20
    `, [startDate, endDate]);

    res.status(200).json({
      kpis: {
        total_output: {
          value: periodSummary.total_actual || 0,
          label: 'Total Units Produced'
        },
        plan_achievement: {
          value: calculatePercentage(periodSummary.total_actual, periodSummary.total_planned),
          label: 'Plan Achievement %'
        },
        average_yield: {
          value: parseFloat(periodSummary.overall_yield || 0).toFixed(2),
          label: 'Average Yield %'
        },
        on_target_rate: {
          value: calculatePercentage(periodSummary.on_target_orders, periodSummary.total_orders),
          label: 'On-Target Orders %'
        }
      },
      monthlyTrend: monthlyOutput,
      topProducts: productOutput,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getOutput:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}