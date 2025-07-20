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

    // Product P&L
    const productPL = await db.allAsync(`
      SELECT 
        p.sku,
        p.name,
        p.category,
        SUM(soi.total_price) as revenue,
        SUM(soi.quantity * p.unit_cost) as cogs,
        SUM(soi.total_price - soi.quantity * p.unit_cost) as gross_profit,
        AVG((soi.total_price - soi.quantity * p.unit_cost) / NULLIF(soi.total_price, 0) * 100) as gross_margin
      FROM sales_order_items soi
      JOIN products p ON soi.product_id = p.id
      JOIN sales_orders so ON soi.order_id = so.id
      WHERE so.order_date BETWEEN ? AND ?
        AND so.status != 'cancelled'
      GROUP BY p.id, p.sku, p.name, p.category
      ORDER BY gross_profit DESC
      LIMIT 30
    `, [startDate, endDate]);

    // Calculate EBITDA contribution (simplified allocation)
    const totalRevenue = productPL.reduce((sum, p) => sum + p.revenue, 0);
    const productEBITDA = productPL.map(product => {
      const revenueShare = product.revenue / totalRevenue;
      const allocatedOpex = revenueShare * 50000; // Simplified allocation
      const ebitda = product.gross_profit - allocatedOpex;
      
      return {
        ...product,
        ebitda,
        ebitda_margin: calculatePercentage(ebitda, product.revenue)
      };
    });

    // Category profitability
    const categoryProfit = await db.allAsync(`
      SELECT 
        p.category,
        COUNT(DISTINCT p.id) as product_count,
        SUM(soi.total_price) as revenue,
        SUM(soi.total_price - soi.quantity * p.unit_cost) as gross_profit,
        AVG((soi.total_price - soi.quantity * p.unit_cost) / NULLIF(soi.total_price, 0) * 100) as avg_margin
      FROM sales_order_items soi
      JOIN products p ON soi.product_id = p.id
      JOIN sales_orders so ON soi.order_id = so.id
      WHERE so.order_date BETWEEN ? AND ?
        AND so.status != 'cancelled'
      GROUP BY p.category
      ORDER BY gross_profit DESC
    `, [startDate, endDate]);

    res.status(200).json({
      productPL: productEBITDA,
      categoryProfitability: categoryProfit,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getByProduct:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}