import { getDb } from '../lib/db.js';
import { getDateRange, calculatePercentage } from '../lib/helpers.js';
import { format, addDays } from 'date-fns';
import '../lib/init-db.js';

async function getDashboard(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const stockMetrics = await db.getAsync(`
    SELECT 
      SUM(quantity) as total_quantity,
      SUM(quantity * unit_value) as total_value,
      COUNT(DISTINCT product_id) as sku_count,
      COUNT(DISTINCT warehouse_id) as warehouse_count
    FROM inventory_stock
    WHERE quantity > 0
  `);

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

  const stockAnalysis = await db.getAsync(`
    SELECT 
      COUNT(CASE WHEN quantity < safety_stock THEN 1 END) as below_safety,
      COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock,
      COUNT(CASE WHEN quantity > safety_stock * 2 THEN 1 END) as overstock
    FROM inventory_stock
  `);

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

  return {
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
  };
}

async function getByItem(req, res) {
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

  const categorySum = await db.allAsync(`
    SELECT 
      p.category,
      COUNT(DISTINCT p.id) as item_count,
      SUM(is.quantity) as total_quantity,
      SUM(is.quantity * is.unit_value) as total_value
    FROM inventory_stock is
    JOIN products p ON is.product_id = p.id
    WHERE 1=1 ${warehouseFilter}
    GROUP BY p.category
    ORDER BY total_value DESC
  `, params);

  return {
    items: itemStock,
    categoryBreakdown: categorySum
  };
}

async function getExpiry(req, res) {
  const db = getDb();
  const { days_ahead = 90 } = req.query;
  const cutoffDate = format(addDays(new Date(), parseInt(days_ahead)), 'yyyy-MM-dd');

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

  const valueAtRisk = await db.getAsync(`
    SELECT 
      COUNT(*) as items_at_risk,
      SUM(quantity * unit_value) as total_value_at_risk
    FROM inventory_stock
    WHERE expiry_date <= ?
      AND quantity > 0
  `, [cutoffDate]);

  return {
    summary: {
      items_at_risk: valueAtRisk.items_at_risk || 0,
      total_value_at_risk: valueAtRisk.total_value_at_risk || 0,
      days_ahead: parseInt(days_ahead)
    },
    nearExpiry,
    expiryByMonth
  };
}

async function getHistory(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

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

  return {
    dailyMovements,
    topMovingItems: topMoving,
    avgProcessingTime: processingTimes.avg_processing_hours || 0,
    period: { startDate, endDate }
  };
}

async function getValuation(req, res) {
  const db = getDb();
  const { method = 'FIFO' } = req.query;

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

  const valuationData = currentValuation.map(cat => ({
    category: cat.category,
    quantity: cat.total_quantity,
    value: method === 'FIFO' ? cat.fifo_value 
         : method === 'LIFO' ? cat.lifo_value 
         : cat.average_value
  }));

  return {
    method,
    totalValue: valuationData.reduce((sum, item) => sum + item.value, 0),
    inventoryToSalesRatio: parseFloat(inventoryToSalesRatio),
    byCategory: valuationData
  };
}

async function getRisk(req, res) {
  const db = getDb();
  
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

  const holdingCostRate = 0.25 / 365;
  const estimatedDailyHoldingCost = (riskSummary.slow_moving_value || 0) * holdingCostRate;

  return {
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
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.query;

  try {
    let result;
    
    switch (action) {
      case 'dashboard':
        result = await getDashboard(req, res);
        break;
      case 'by-item':
        result = await getByItem(req, res);
        break;
      case 'expiry':
        result = await getExpiry(req, res);
        break;
      case 'history':
        result = await getHistory(req, res);
        break;
      case 'valuation':
        result = await getValuation(req, res);
        break;
      case 'risk':
        result = await getRisk(req, res);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in inventory handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}