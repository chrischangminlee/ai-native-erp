import { getDb } from '../_lib/db.js';
import '../_lib/init-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    
    // Slow-moving items (no movement in 60+ days)
    const slowMoving = await db.allAsync(`
      SELECT 
        p.sku,
        p.name,
        p.category,
        is.quantity,
        is.unit_value,
        is.quantity * is.unit_value as tied_up_value,
        JULIANDAY('now') - JULIANDAY(is.last_movement_date) as days_since_movement
      FROM inventory_stock is
      JOIN products p ON is.product_id = p.id
      WHERE is.quantity > 0
        AND (is.last_movement_date IS NULL OR 
             JULIANDAY('now') - JULIANDAY(is.last_movement_date) > 60)
      ORDER BY tied_up_value DESC
      LIMIT 20
    `);

    // Overstock items
    const overstock = await db.allAsync(`
      SELECT 
        p.sku,
        p.name,
        is.quantity,
        is.safety_stock,
        is.quantity - is.safety_stock as excess_quantity,
        (is.quantity - is.safety_stock) * is.unit_value as excess_value
      FROM inventory_stock is
      JOIN products p ON is.product_id = p.id
      WHERE is.quantity > is.safety_stock * 2
      ORDER BY excess_value DESC
      LIMIT 20
    `);

    // Risk summary
    const riskSummary = await db.getAsync(`
      SELECT 
        SUM(CASE 
          WHEN last_movement_date IS NULL OR 
               JULIANDAY('now') - JULIANDAY(last_movement_date) > 60 
          THEN quantity * unit_value 
          ELSE 0 
        END) as slow_moving_value,
        SUM(CASE 
          WHEN quantity > safety_stock * 2 
          THEN (quantity - safety_stock) * unit_value 
          ELSE 0 
        END) as overstock_value,
        SUM(CASE 
          WHEN JULIANDAY(expiry_date) - JULIANDAY('now') < 30 AND quantity > 0
          THEN quantity * unit_value 
          ELSE 0 
        END) as near_expiry_value
      FROM inventory_stock
    `);

    // Calculate holding costs (estimated at 25% annual)
    const holdingCostRate = 0.25 / 365; // Daily holding cost rate
    const estimatedDailyHoldingCost = (riskSummary.slow_moving_value || 0) * holdingCostRate;

    res.status(200).json({
      slowMovingItems: slowMoving,
      overstockItems: overstock,
      riskSummary: {
        slow_moving_value: riskSummary.slow_moving_value || 0,
        overstock_value: riskSummary.overstock_value || 0,
        near_expiry_value: riskSummary.near_expiry_value || 0,
        total_at_risk: (riskSummary.slow_moving_value || 0) + 
                       (riskSummary.overstock_value || 0) + 
                       (riskSummary.near_expiry_value || 0),
        estimated_daily_holding_cost: estimatedDailyHoldingCost
      }
    });
  } catch (error) {
    console.error('Error in getRisk:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}