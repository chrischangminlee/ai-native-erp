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

    // Material usage analysis
    const materialUsage = await db.allAsync(`
      SELECT 
        p.sku as material_sku,
        p.name as material_name,
        p.category,
        SUM(mc.planned_quantity) as total_planned,
        SUM(mc.actual_quantity) as total_actual,
        AVG(mc.variance_percentage) as avg_variance,
        COUNT(DISTINCT mc.production_order_id) as usage_count
      FROM material_consumption mc
      JOIN products p ON mc.material_id = p.id
      JOIN production_orders po ON mc.production_order_id = po.id
      WHERE po.actual_end_date BETWEEN ? AND ?
      GROUP BY p.id, p.sku, p.name, p.category
      ORDER BY total_actual DESC
      LIMIT 30
    `, [startDate, endDate]);

    // BOM vs Actual comparison
    const bomVariance = await db.allAsync(`
      SELECT 
        prod.sku as product_sku,
        prod.name as product_name,
        mat.sku as material_sku,
        mat.name as material_name,
        AVG(bom.quantity_required) as bom_quantity,
        AVG(mc.actual_quantity / NULLIF(po.actual_quantity, 0)) as actual_per_unit,
        AVG((mc.actual_quantity / NULLIF(po.actual_quantity, 0) - bom.quantity_required) / NULLIF(bom.quantity_required, 0) * 100) as variance_percentage
      FROM bom
      JOIN products prod ON bom.product_id = prod.id
      JOIN products mat ON bom.material_id = mat.id
      LEFT JOIN production_orders po ON po.product_id = prod.id
        AND po.actual_end_date BETWEEN ? AND ?
      LEFT JOIN material_consumption mc ON mc.production_order_id = po.id 
        AND mc.material_id = mat.id
      WHERE po.id IS NOT NULL
      GROUP BY prod.id, mat.id
      HAVING ABS(variance_percentage) > 5
      ORDER BY ABS(variance_percentage) DESC
      LIMIT 20
    `, [startDate, endDate]);

    // Summary metrics
    const usageSummary = await db.getAsync(`
      SELECT 
        SUM(mc.actual_quantity * p.unit_cost) as total_material_cost,
        AVG(ABS(mc.variance_percentage)) as avg_absolute_variance,
        SUM(CASE WHEN mc.variance_percentage > 0 THEN 
          mc.actual_quantity - mc.planned_quantity 
        ELSE 0 END * p.unit_cost) as overuse_cost
      FROM material_consumption mc
      JOIN products p ON mc.material_id = p.id
      JOIN production_orders po ON mc.production_order_id = po.id
      WHERE po.actual_end_date BETWEEN ? AND ?
    `, [startDate, endDate]);

    res.status(200).json({
      materialUsage,
      bomVariance,
      summary: {
        total_material_cost: usageSummary.total_material_cost || 0,
        avg_variance_percentage: parseFloat(usageSummary.avg_absolute_variance || 0).toFixed(2),
        material_overuse_cost: usageSummary.overuse_cost || 0
      },
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getUsage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}