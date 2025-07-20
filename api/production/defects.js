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

    // Defect analysis
    const defectAnalysis = await db.allAsync(`
      SELECT 
        pd.defect_code,
        pd.defect_description,
        COUNT(*) as occurrence_count,
        SUM(pd.quantity) as total_defect_quantity,
        SUM(pd.quantity * p.unit_cost) as defect_cost
      FROM production_defects pd
      JOIN production_orders po ON pd.production_order_id = po.id
      JOIN products p ON po.product_id = p.id
      WHERE pd.defect_date BETWEEN ? AND ?
      GROUP BY pd.defect_code, pd.defect_description
      ORDER BY occurrence_count DESC
    `, [startDate, endDate]);

    // Defect rate by product
    const defectByProduct = await db.allAsync(`
      SELECT 
        p.sku,
        p.name,
        SUM(po.actual_quantity) as total_produced,
        COALESCE(SUM(pd.quantity), 0) as defect_quantity,
        CAST(COALESCE(SUM(pd.quantity), 0) AS REAL) / NULLIF(SUM(po.actual_quantity), 0) * 100 as defect_rate
      FROM production_orders po
      JOIN products p ON po.product_id = p.id
      LEFT JOIN production_defects pd ON po.id = pd.production_order_id
      WHERE po.actual_end_date BETWEEN ? AND ?
        AND po.status = 'completed'
      GROUP BY p.id, p.sku, p.name
      HAVING defect_quantity > 0
      ORDER BY defect_rate DESC
      LIMIT 20
    `, [startDate, endDate]);

    // Summary metrics
    const defectSummary = await db.getAsync(`
      SELECT 
        COUNT(DISTINCT pd.production_order_id) as affected_orders,
        SUM(pd.quantity) as total_defects,
        SUM(pd.quantity * p.unit_cost) as total_scrap_value,
        (SELECT SUM(actual_quantity) FROM production_orders WHERE actual_end_date BETWEEN ? AND ?) as total_production
      FROM production_defects pd
      JOIN production_orders po ON pd.production_order_id = po.id
      JOIN products p ON po.product_id = p.id
      WHERE pd.defect_date BETWEEN ? AND ?
    `, [startDate, endDate, startDate, endDate]);

    const overallDefectRate = defectSummary.total_production > 0
      ? (defectSummary.total_defects / defectSummary.total_production * 100).toFixed(2)
      : 0;

    // Monthly trend
    const monthlyDefectTrend = await db.allAsync(`
      SELECT 
        strftime('%Y-%m', pd.defect_date) as month,
        COUNT(*) as defect_incidents,
        SUM(pd.quantity) as defect_quantity
      FROM production_defects pd
      WHERE pd.defect_date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', pd.defect_date)
      ORDER BY month
    `);

    res.status(200).json({
      defectCodes: defectAnalysis,
      productDefects: defectByProduct,
      summary: {
        overall_defect_rate: parseFloat(overallDefectRate),
        total_defect_quantity: defectSummary.total_defects || 0,
        scrap_value: defectSummary.total_scrap_value || 0,
        affected_orders: defectSummary.affected_orders || 0
      },
      trend: monthlyDefectTrend,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getDefects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}