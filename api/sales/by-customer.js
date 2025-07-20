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

    // Top customers
    const topCustomers = await db.allAsync(`
      SELECT 
        c.code,
        c.name,
        c.region,
        c.customer_type,
        COUNT(DISTINCT so.id) as order_count,
        SUM(soi.total_price) as revenue,
        AVG(JULIANDAY(so2.order_date) - JULIANDAY(so.order_date)) as avg_reorder_days
      FROM customers c
      JOIN sales_orders so ON c.id = so.customer_id
      JOIN sales_order_items soi ON so.id = soi.order_id
      LEFT JOIN sales_orders so2 ON c.id = so2.customer_id 
        AND so2.order_date > so.order_date
      WHERE so.order_date BETWEEN ? AND ?
        AND so.status != 'cancelled'
      GROUP BY c.id, c.code, c.name, c.region, c.customer_type
      ORDER BY revenue DESC
      LIMIT 20
    `, [startDate, endDate]);

    // Customer type analysis
    const customerTypeAnalysis = await db.allAsync(`
      SELECT 
        c.customer_type,
        COUNT(DISTINCT c.id) as customer_count,
        COUNT(DISTINCT so.id) as order_count,
        SUM(soi.total_price) as revenue,
        AVG(soi.total_price) as avg_order_value
      FROM customers c
      JOIN sales_orders so ON c.id = so.customer_id
      JOIN sales_order_items soi ON so.id = soi.order_id
      WHERE so.order_date BETWEEN ? AND ?
        AND so.status != 'cancelled'
      GROUP BY c.customer_type
    `, [startDate, endDate]);

    res.status(200).json({
      topCustomers,
      customerTypeAnalysis,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getByCustomer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}