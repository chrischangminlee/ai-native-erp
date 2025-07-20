import { getDb } from '../_lib/db.js';
import { getDateRange, calculateYoY, calculatePercentage } from '../_lib/helpers.js';
import '../_lib/init-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    const { period = 'current-month' } = req.query;
    const { startDate, endDate } = getDateRange(period);
    
    // Current period metrics
    const currentMetrics = await db.getAsync(`
      SELECT 
        COUNT(DISTINCT so.id) as order_count,
        COUNT(DISTINCT so.customer_id) as customer_count,
        SUM(soi.total_price) as revenue,
        SUM(soi.quantity) as units_sold,
        AVG(soi.unit_price) as avg_unit_price,
        SUM(soi.margin) as total_margin
      FROM sales_orders so
      JOIN sales_order_items soi ON so.id = soi.order_id
      WHERE so.order_date BETWEEN ? AND ?
        AND so.status != 'cancelled'
    `, [startDate, endDate]);

    // Previous period for YoY comparison
    const prevStartDate = `${parseInt(startDate.substring(0, 4)) - 1}${startDate.substring(4)}`;
    const prevEndDate = `${parseInt(endDate.substring(0, 4)) - 1}${endDate.substring(4)}`;
    
    const previousMetrics = await db.getAsync(`
      SELECT 
        SUM(soi.total_price) as revenue,
        SUM(soi.quantity) as units_sold
      FROM sales_orders so
      JOIN sales_order_items soi ON so.id = soi.order_id
      WHERE so.order_date BETWEEN ? AND ?
        AND so.status != 'cancelled'
    `, [prevStartDate, prevEndDate]);

    // New vs repeat customers
    const customerAnalysis = await db.allAsync(`
      SELECT 
        c.customer_type,
        COUNT(DISTINCT so.id) as order_count,
        SUM(soi.total_price) as revenue
      FROM sales_orders so
      JOIN sales_order_items soi ON so.id = soi.order_id
      JOIN customers c ON so.customer_id = c.id
      WHERE so.order_date BETWEEN ? AND ?
        AND so.status != 'cancelled'
      GROUP BY c.customer_type
    `, [startDate, endDate]);

    const newCustomerRevenue = customerAnalysis.find(c => c.customer_type === 'new')?.revenue || 0;
    const totalRevenue = currentMetrics.revenue || 0;

    // Monthly trend
    const monthlyTrend = await db.allAsync(`
      SELECT 
        strftime('%Y-%m', so.order_date) as month,
        SUM(soi.total_price) as revenue,
        COUNT(DISTINCT so.id) as order_count
      FROM sales_orders so
      JOIN sales_order_items soi ON so.id = soi.order_id
      WHERE so.order_date >= date('now', '-12 months')
        AND so.status != 'cancelled'
      GROUP BY strftime('%Y-%m', so.order_date)
      ORDER BY month
    `);

    res.status(200).json({
      kpis: {
        revenue: {
          value: currentMetrics.revenue || 0,
          yoy: calculateYoY(currentMetrics.revenue, previousMetrics?.revenue),
          label: 'Revenue'
        },
        units_sold: {
          value: currentMetrics.units_sold || 0,
          yoy: calculateYoY(currentMetrics.units_sold, previousMetrics?.units_sold),
          label: 'Units Sold'
        },
        avg_unit_price: {
          value: currentMetrics.avg_unit_price || 0,
          label: 'Average Unit Price'
        },
        new_customer_ratio: {
          value: calculatePercentage(newCustomerRevenue, totalRevenue),
          label: 'New Customer Revenue %'
        },
        gross_margin: {
          value: calculatePercentage(currentMetrics.total_margin, totalRevenue),
          label: 'Gross Margin %'
        },
        order_count: {
          value: currentMetrics.order_count || 0,
          label: 'Total Orders'
        }
      },
      trend: monthlyTrend.map(m => ({
        month: m.month,
        revenue: m.revenue || 0,
        orders: m.order_count || 0
      })),
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error fetching sales dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}