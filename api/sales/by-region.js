import { getDb } from '../_lib/db.js';
import { getDateRange, calculateYoY } from '../_lib/helpers.js';
import '../_lib/init-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    const { period = 'current-month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Regional breakdown
    const regionalBreakdown = await db.allAsync(`
      SELECT 
        c.region,
        c.country,
        COUNT(DISTINCT so.id) as order_count,
        SUM(soi.total_price) as revenue,
        COUNT(DISTINCT c.id) as customer_count
      FROM customers c
      JOIN sales_orders so ON c.id = so.customer_id
      JOIN sales_order_items soi ON so.id = soi.order_id
      WHERE so.order_date BETWEEN ? AND ?
        AND so.status != 'cancelled'
      GROUP BY c.region, c.country
      ORDER BY revenue DESC
    `, [startDate, endDate]);

    // Calculate growth rates
    const prevStartDate = `${parseInt(startDate.substring(0, 4)) - 1}${startDate.substring(4)}`;
    const prevEndDate = `${parseInt(endDate.substring(0, 4)) - 1}${endDate.substring(4)}`;
    
    const previousRegional = await db.allAsync(`
      SELECT 
        c.region,
        SUM(soi.total_price) as revenue
      FROM customers c
      JOIN sales_orders so ON c.id = so.customer_id
      JOIN sales_order_items soi ON so.id = soi.order_id
      WHERE so.order_date BETWEEN ? AND ?
        AND so.status != 'cancelled'
      GROUP BY c.region
    `, [prevStartDate, prevEndDate]);

    const prevRevenueMap = Object.fromEntries(
      previousRegional.map(r => [r.region, r.revenue])
    );

    const regionsWithGrowth = regionalBreakdown.map(region => ({
      ...region,
      growth_rate: calculateYoY(region.revenue, prevRevenueMap[region.region] || 0)
    }));

    res.status(200).json({
      regionalBreakdown: regionsWithGrowth,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getByRegion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}