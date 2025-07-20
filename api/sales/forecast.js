import { getDb } from '../_lib/db.js';
import { generateForecast } from '../_lib/helpers.js';
import '../_lib/init-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    const { periods = 3 } = req.query;
    
    // Get historical monthly data
    const historicalData = await db.allAsync(`
      SELECT 
        strftime('%Y-%m-01', so.order_date) as date,
        SUM(soi.total_price) as value
      FROM sales_orders so
      JOIN sales_order_items soi ON so.id = soi.order_id
      WHERE so.order_date >= date('now', '-24 months')
        AND so.status != 'cancelled'
      GROUP BY strftime('%Y-%m', so.order_date)
      ORDER BY date
    `);

    const forecast = generateForecast(historicalData, parseInt(periods));
    
    res.status(200).json({
      historical: historicalData,
      forecast: forecast,
      method: 'Linear Trend',
      confidence_level: 90
    });
  } catch (error) {
    console.error('Error in getForecast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}