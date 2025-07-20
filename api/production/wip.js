import { getDb } from '../_lib/db.js';
import '../_lib/init-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    
    // Current WIP status
    const currentWIP = await db.allAsync(`
      SELECT 
        pp.name as process_name,
        p.sku,
        p.name as product_name,
        po.order_number,
        po.planned_quantity,
        po.planned_start_date,
        po.planned_end_date,
        JULIANDAY('now') - JULIANDAY(po.actual_start_date) as days_in_production,
        CASE 
          WHEN po.actual_start_date IS NULL THEN 'Not Started'
          WHEN JULIANDAY('now') - JULIANDAY(po.planned_end_date) > 0 THEN 'Delayed'
          ELSE 'On Track'
        END as status
      FROM production_orders po
      JOIN products p ON po.product_id = p.id
      JOIN production_processes pp ON po.process_id = pp.id
      WHERE po.status = 'in_progress'
      ORDER BY po.planned_start_date
    `);

    // WIP by stage/process
    const wipByProcess = await db.allAsync(`
      SELECT 
        pp.name as process_name,
        COUNT(po.id) as order_count,
        SUM(po.planned_quantity) as total_quantity,
        AVG(JULIANDAY('now') - JULIANDAY(po.actual_start_date)) as avg_days_in_process
      FROM production_orders po
      JOIN production_processes pp ON po.process_id = pp.id
      WHERE po.status = 'in_progress'
      GROUP BY pp.id, pp.name
    `);

    // WIP value
    const wipValue = await db.getAsync(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(po.planned_quantity * p.unit_cost) as total_wip_value,
        SUM(CASE WHEN JULIANDAY('now') > JULIANDAY(po.planned_end_date) THEN 1 ELSE 0 END) as delayed_orders
      FROM production_orders po
      JOIN products p ON po.product_id = p.id
      WHERE po.status = 'in_progress'
    `);

    // Aging analysis
    const agingBuckets = await db.allAsync(`
      SELECT 
        CASE 
          WHEN JULIANDAY('now') - JULIANDAY(actual_start_date) <= 7 THEN '0-7 days'
          WHEN JULIANDAY('now') - JULIANDAY(actual_start_date) <= 14 THEN '8-14 days'
          WHEN JULIANDAY('now') - JULIANDAY(actual_start_date) <= 30 THEN '15-30 days'
          ELSE 'Over 30 days'
        END as age_bucket,
        COUNT(*) as order_count,
        SUM(planned_quantity * p.unit_cost) as value
      FROM production_orders po
      JOIN products p ON po.product_id = p.id
      WHERE po.status = 'in_progress' 
        AND po.actual_start_date IS NOT NULL
      GROUP BY age_bucket
      ORDER BY 
        CASE age_bucket
          WHEN '0-7 days' THEN 1
          WHEN '8-14 days' THEN 2
          WHEN '15-30 days' THEN 3
          ELSE 4
        END
    `);

    res.status(200).json({
      currentOrders: currentWIP,
      byProcess: wipByProcess,
      summary: {
        total_orders: wipValue.total_orders || 0,
        total_value: wipValue.total_wip_value || 0,
        delayed_orders: wipValue.delayed_orders || 0,
        delayed_percentage: wipValue.total_orders > 0 
          ? ((wipValue.delayed_orders / wipValue.total_orders) * 100).toFixed(2)
          : 0
      },
      aging: agingBuckets
    });
  } catch (error) {
    console.error('Error in getWIP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}