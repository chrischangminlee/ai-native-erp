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

    // Material cost variance
    const materialVariance = await db.allAsync(`
      SELECT 
        p.sku,
        p.name,
        p.unit_cost as standard_cost,
        AVG(soi.unit_price - soi.margin / NULLIF(soi.quantity, 0)) as actual_cost,
        AVG((soi.unit_price - soi.margin / NULLIF(soi.quantity, 0)) - p.unit_cost) as variance_amount,
        AVG(((soi.unit_price - soi.margin / NULLIF(soi.quantity, 0)) - p.unit_cost) / NULLIF(p.unit_cost, 0) * 100) as variance_percentage,
        SUM(soi.quantity) as quantity_sold
      FROM sales_order_items soi
      JOIN products p ON soi.product_id = p.id
      JOIN sales_orders so ON soi.order_id = so.id
      WHERE so.order_date BETWEEN ? AND ?
        AND so.status != 'cancelled'
      GROUP BY p.id, p.sku, p.name, p.unit_cost
      HAVING ABS(variance_percentage) > 5
      ORDER BY ABS(variance_amount * quantity_sold) DESC
      LIMIT 20
    `, [startDate, endDate]);

    // Production efficiency variance
    const efficiencyVariance = await db.allAsync(`
      SELECT 
        pp.name as process_name,
        pp.standard_cycle_time,
        AVG(CAST((JULIANDAY(po.actual_end_date) - JULIANDAY(po.actual_start_date)) * 24 * 60 AS REAL)) as actual_cycle_time,
        COUNT(po.id) as order_count,
        AVG(po.yield_percentage) as avg_yield
      FROM production_processes pp
      JOIN production_orders po ON pp.id = po.process_id
      WHERE po.actual_end_date BETWEEN ? AND ?
        AND po.status = 'completed'
      GROUP BY pp.id, pp.name, pp.standard_cycle_time
    `, [startDate, endDate]);

    // Calculate savings potential
    const totalMaterialVariance = materialVariance.reduce((sum, item) => 
      sum + (item.variance_amount * item.quantity_sold), 0
    );

    const efficiencyImpact = efficiencyVariance.reduce((sum, process) => {
      const timeVariance = (process.actual_cycle_time - process.standard_cycle_time) / 60; // hours
      const laborCostPerHour = 25; // Assumed labor cost
      return sum + (timeVariance * laborCostPerHour * process.order_count);
    }, 0);

    res.status(200).json({
      materialVariance,
      processVariance: efficiencyVariance.map(p => ({
        ...p,
        time_variance: p.actual_cycle_time - p.standard_cycle_time,
        efficiency: (p.standard_cycle_time / p.actual_cycle_time * 100).toFixed(2)
      })),
      savingsPotential: {
        material_variance_impact: Math.abs(totalMaterialVariance),
        efficiency_variance_impact: Math.abs(efficiencyImpact),
        total_savings_potential: Math.abs(totalMaterialVariance) + Math.abs(efficiencyImpact)
      },
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getVariance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}