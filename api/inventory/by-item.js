import { getDb } from '../_lib/db.js';
import '../_lib/init-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    const { warehouse_id } = req.query;
    
    let warehouseFilter = '';
    const params = [];
    
    if (warehouse_id) {
      warehouseFilter = 'AND is.warehouse_id = ?';
      params.push(warehouse_id);
    }

    const itemStock = await db.allAsync(`
      SELECT 
        p.sku,
        p.name,
        p.category,
        w.name as warehouse,
        is.lot_number,
        is.quantity,
        is.safety_stock,
        is.quantity - is.safety_stock as safety_gap,
        is.unit_value,
        is.quantity * is.unit_value as total_value,
        is.expiry_date,
        JULIANDAY(is.expiry_date) - JULIANDAY('now') as days_to_expiry
      FROM inventory_stock is
      JOIN products p ON is.product_id = p.id
      JOIN warehouses w ON is.warehouse_id = w.id
      WHERE 1=1 ${warehouseFilter}
      ORDER BY is.quantity DESC
      LIMIT 100
    `, params);

    // Summary by category
    const categorySum = await db.allAsync(`
      SELECT 
        p.category,
        COUNT(DISTINCT p.id) as item_count,
        SUM(is.quantity) as total_quantity,
        SUM(is.quantity * is.unit_value) as total_value
      FROM inventory_stock is
      JOIN products p ON is.product_id = p.id
      WHERE 1=1 ${warehouseFilter.replace('is.', 'is.')}
      GROUP BY p.category
      ORDER BY total_value DESC
    `, params);

    res.status(200).json({
      items: itemStock,
      categoryBreakdown: categorySum
    });
  } catch (error) {
    console.error('Error in getByItem:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}