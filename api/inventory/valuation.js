import { getDb } from '../_lib/db.js';
import '../_lib/init-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    const { method = 'FIFO' } = req.query;

    // Current valuation by method
    const currentValuation = await db.allAsync(`
      SELECT 
        p.category,
        SUM(is.quantity) as total_quantity,
        SUM(is.quantity * is.unit_value) as fifo_value,
        SUM(is.quantity * p.unit_cost) as average_value,
        SUM(is.quantity * p.unit_cost * 1.1) as lifo_value
      FROM inventory_stock is
      JOIN products p ON is.product_id = p.id
      WHERE is.quantity > 0
      GROUP BY p.category
    `);

    // Inventory to sales ratio
    const inventoryValue = await db.getAsync(`
      SELECT SUM(quantity * unit_value) as total_value
      FROM inventory_stock
      WHERE quantity > 0
    `);

    const monthlySales = await db.getAsync(`
      SELECT AVG(monthly_sales) as avg_monthly_sales
      FROM (
        SELECT 
          strftime('%Y-%m', so.order_date) as month,
          SUM(soi.total_price) as monthly_sales
        FROM sales_orders so
        JOIN sales_order_items soi ON so.id = soi.order_id
        WHERE so.order_date >= date('now', '-6 months')
          AND so.status != 'cancelled'
        GROUP BY strftime('%Y-%m', so.order_date)
      )
    `);

    const inventoryToSalesRatio = monthlySales.avg_monthly_sales 
      ? (inventoryValue.total_value / monthlySales.avg_monthly_sales).toFixed(2)
      : 0;

    // Prepare valuation data based on method
    const valuationData = currentValuation.map(cat => ({
      category: cat.category,
      quantity: cat.total_quantity,
      value: method === 'FIFO' ? cat.fifo_value 
           : method === 'LIFO' ? cat.lifo_value 
           : cat.average_value
    }));

    res.status(200).json({
      method,
      totalValue: valuationData.reduce((sum, item) => sum + item.value, 0),
      inventoryToSalesRatio: parseFloat(inventoryToSalesRatio),
      byCategory: valuationData
    });
  } catch (error) {
    console.error('Error in getValuation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}