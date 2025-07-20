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

    // Top products
    const topProducts = await db.allAsync(`
      SELECT 
        p.sku,
        p.name,
        p.category,
        SUM(soi.quantity) as units_sold,
        SUM(soi.total_price) as revenue,
        SUM(soi.margin) as gross_profit,
        AVG(soi.margin / NULLIF(soi.total_price, 0) * 100) as margin_percentage
      FROM sales_order_items soi
      JOIN products p ON soi.product_id = p.id
      JOIN sales_orders so ON soi.order_id = so.id
      WHERE so.order_date BETWEEN ? AND ?
        AND so.status != 'cancelled'
      GROUP BY p.id, p.sku, p.name, p.category
      ORDER BY revenue DESC
      LIMIT 20
    `, [startDate, endDate]);

    // Category breakdown
    const categoryBreakdown = await db.allAsync(`
      SELECT 
        p.category,
        SUM(soi.quantity) as units_sold,
        SUM(soi.total_price) as revenue,
        COUNT(DISTINCT p.id) as product_count
      FROM sales_order_items soi
      JOIN products p ON soi.product_id = p.id
      JOIN sales_orders so ON soi.order_id = so.id
      WHERE so.order_date BETWEEN ? AND ?
        AND so.status != 'cancelled'
      GROUP BY p.category
      ORDER BY revenue DESC
    `, [startDate, endDate]);

    res.status(200).json({
      topProducts,
      categoryBreakdown,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getByProduct:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}