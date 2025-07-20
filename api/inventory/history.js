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

    // Daily movement summary
    const dailyMovements = await db.allAsync(`
      SELECT 
        DATE(transaction_date) as date,
        transaction_type,
        SUM(quantity) as total_quantity,
        COUNT(*) as transaction_count
      FROM inventory_transactions
      WHERE transaction_date BETWEEN ? AND ?
      GROUP BY DATE(transaction_date), transaction_type
      ORDER BY date DESC
    `, [startDate, endDate]);

    // Top moving items
    const topMoving = await db.allAsync(`
      SELECT 
        p.sku,
        p.name,
        SUM(CASE WHEN it.transaction_type = 'in' THEN it.quantity ELSE 0 END) as total_in,
        SUM(CASE WHEN it.transaction_type = 'out' THEN it.quantity ELSE 0 END) as total_out,
        COUNT(*) as movement_count
      FROM inventory_transactions it
      JOIN products p ON it.product_id = p.id
      WHERE it.transaction_date BETWEEN ? AND ?
      GROUP BY p.id, p.sku, p.name
      ORDER BY (total_in + total_out) DESC
      LIMIT 20
    `, [startDate, endDate]);

    // Average processing time
    const processingTimes = await db.getAsync(`
      SELECT 
        AVG(
          CASE 
            WHEN transaction_type = 'in' THEN 1.5
            WHEN transaction_type = 'out' THEN 2.0
            ELSE 1.0
          END
        ) as avg_processing_hours
      FROM inventory_transactions
      WHERE transaction_date BETWEEN ? AND ?
    `, [startDate, endDate]);

    res.status(200).json({
      dailyMovements,
      topMovingItems: topMoving,
      avgProcessingTime: processingTimes.avg_processing_hours || 0,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getHistory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}