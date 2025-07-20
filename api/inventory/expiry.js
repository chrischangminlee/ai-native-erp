import { getDb } from '../_lib/db.js';
import { format, addDays } from 'date-fns';
import '../_lib/init-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    const { days_ahead = 90 } = req.query;
    const cutoffDate = format(addDays(new Date(), parseInt(days_ahead)), 'yyyy-MM-dd');

    // Near-expiry items
    const nearExpiry = await db.allAsync(`
      SELECT 
        p.sku,
        p.name,
        w.name as warehouse,
        is.lot_number,
        is.quantity,
        is.unit_value,
        is.quantity * is.unit_value as value_at_risk,
        is.expiry_date,
        JULIANDAY(is.expiry_date) - JULIANDAY('now') as days_to_expiry
      FROM inventory_stock is
      JOIN products p ON is.product_id = p.id
      JOIN warehouses w ON is.warehouse_id = w.id
      WHERE is.expiry_date <= ?
        AND is.quantity > 0
      ORDER BY is.expiry_date
    `, [cutoffDate]);

    // Expiry summary by month
    const expiryByMonth = await db.allAsync(`
      SELECT 
        strftime('%Y-%m', expiry_date) as expiry_month,
        COUNT(*) as lot_count,
        SUM(quantity) as total_quantity,
        SUM(quantity * unit_value) as total_value
      FROM inventory_stock
      WHERE expiry_date >= date('now')
        AND quantity > 0
      GROUP BY strftime('%Y-%m', expiry_date)
      ORDER BY expiry_month
      LIMIT 12
    `);

    // Total value at risk
    const valueAtRisk = await db.getAsync(`
      SELECT 
        COUNT(*) as items_at_risk,
        SUM(quantity * unit_value) as total_value_at_risk
      FROM inventory_stock
      WHERE expiry_date <= ?
        AND quantity > 0
    `, [cutoffDate]);

    res.status(200).json({
      summary: {
        items_at_risk: valueAtRisk.items_at_risk || 0,
        total_value_at_risk: valueAtRisk.total_value_at_risk || 0,
        days_ahead: parseInt(days_ahead)
      },
      nearExpiry,
      expiryByMonth
    });
  } catch (error) {
    console.error('Error in getExpiry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}