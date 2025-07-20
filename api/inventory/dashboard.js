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

    // Current stock metrics
    const stockMetrics = await db.getAsync(`
      SELECT 
        SUM(quantity) as total_quantity,
        SUM(quantity * unit_value) as total_value,
        COUNT(DISTINCT product_id) as sku_count,
        COUNT(DISTINCT warehouse_id) as warehouse_count
      FROM inventory_stock
      WHERE quantity > 0
    `);

    // Inventory turnover
    const avgInventoryValue = await db.getAsync(`
      SELECT AVG(daily_value) as avg_value
      FROM (
        SELECT 
          DATE(transaction_date) as date,
          SUM(quantity * 
            CASE 
              WHEN transaction_type = 'in' THEN 1 
              WHEN transaction_type = 'out' THEN -1 
              ELSE 0 
            END * (SELECT unit_cost FROM products WHERE id = product_id)
          ) as daily_value
        FROM inventory_transactions
        WHERE transaction_date BETWEEN ? AND ?
        GROUP BY DATE(transaction_date)
      )
    `, [startDate, endDate]);

    const cogs = await db.getAsync(`
      SELECT SUM(p.unit_cost * soi.quantity) as cogs
      FROM sales_order_items soi
      JOIN products p ON soi.product_id = p.id
      JOIN sales_orders so ON soi.order_id = so.id
      WHERE so.order_date BETWEEN ? AND ?
        AND so.status != 'cancelled'
    `, [startDate, endDate]);

    const turnoverRate = cogs.cogs && avgInventoryValue.avg_value 
      ? (cogs.cogs / avgInventoryValue.avg_value).toFixed(2) 
      : 0;

    const daysOnHand = turnoverRate > 0 ? (365 / turnoverRate).toFixed(0) : 0;

    // Stock levels vs safety stock
    const stockAnalysis = await db.getAsync(`
      SELECT 
        COUNT(CASE WHEN quantity < safety_stock THEN 1 END) as below_safety,
        COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock,
        COUNT(CASE WHEN quantity > safety_stock * 2 THEN 1 END) as overstock
      FROM inventory_stock
    `);

    // Monthly trend
    const monthlyTrend = await db.allAsync(`
      SELECT 
        strftime('%Y-%m', transaction_date) as month,
        SUM(CASE WHEN transaction_type = 'in' THEN quantity ELSE 0 END) as inbound,
        SUM(CASE WHEN transaction_type = 'out' THEN quantity ELSE 0 END) as outbound,
        SUM(CASE WHEN transaction_type = 'transfer' THEN quantity ELSE 0 END) as transfers
      FROM inventory_transactions
      WHERE transaction_date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month
    `);

    res.status(200).json({
      kpis: {
        total_value: {
          value: stockMetrics.total_value || 0,
          label: 'Total Inventory Value'
        },
        total_quantity: {
          value: stockMetrics.total_quantity || 0,
          label: 'Total Stock Quantity'
        },
        turnover_rate: {
          value: parseFloat(turnoverRate),
          label: 'Inventory Turnover'
        },
        days_on_hand: {
          value: parseInt(daysOnHand),
          label: 'Days on Hand'
        },
        below_safety_stock: {
          value: stockAnalysis.below_safety || 0,
          label: 'Items Below Safety Stock'
        },
        stock_accuracy: {
          value: calculatePercentage(
            stockMetrics.sku_count - stockAnalysis.out_of_stock,
            stockMetrics.sku_count
          ),
          label: 'Stock Accuracy %'
        }
      },
      trend: monthlyTrend,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error fetching inventory dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}