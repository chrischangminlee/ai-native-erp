import { getDb } from './_lib/db.js';
import { getDateRange, calculateYoY, calculatePercentage, generateForecast } from './_lib/helpers.js';
import './_lib/init-db.js';

async function getDashboard(req, res) {
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

  return {
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
  };
}

async function getByProduct(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const topProducts = await db.allAsync(`
    SELECT 
      p.sku,
      p.name,
      p.category,
      SUM(soi.quantity) as units_sold,
      SUM(soi.total_price) as revenue,
      SUM(soi.margin) as gross_profit,
      AVG(soi.margin / NULLIF(soi.total_price, 0) * 100) as margin_percentage
    FROM sales_order_items soi
    JOIN products p ON soi.product_id = p.id
    JOIN sales_orders so ON soi.order_id = so.id
    WHERE so.order_date BETWEEN ? AND ?
      AND so.status != 'cancelled'
    GROUP BY p.id, p.sku, p.name, p.category
    ORDER BY revenue DESC
    LIMIT 20
  `, [startDate, endDate]);

  const categoryBreakdown = await db.allAsync(`
    SELECT 
      p.category,
      SUM(soi.quantity) as units_sold,
      SUM(soi.total_price) as revenue,
      COUNT(DISTINCT p.id) as product_count
    FROM sales_order_items soi
    JOIN products p ON soi.product_id = p.id
    JOIN sales_orders so ON soi.order_id = so.id
    WHERE so.order_date BETWEEN ? AND ?
      AND so.status != 'cancelled'
    GROUP BY p.category
    ORDER BY revenue DESC
  `, [startDate, endDate]);

  return {
    topProducts,
    categoryBreakdown,
    period: { startDate, endDate }
  };
}

async function getByCustomer(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const topCustomers = await db.allAsync(`
    SELECT 
      c.code,
      c.name,
      c.region,
      c.customer_type,
      COUNT(DISTINCT so.id) as order_count,
      SUM(soi.total_price) as revenue,
      AVG(JULIANDAY(so2.order_date) - JULIANDAY(so.order_date)) as avg_reorder_days
    FROM customers c
    JOIN sales_orders so ON c.id = so.customer_id
    JOIN sales_order_items soi ON so.id = soi.order_id
    LEFT JOIN sales_orders so2 ON c.id = so2.customer_id 
      AND so2.order_date > so.order_date
    WHERE so.order_date BETWEEN ? AND ?
      AND so.status != 'cancelled'
    GROUP BY c.id, c.code, c.name, c.region, c.customer_type
    ORDER BY revenue DESC
    LIMIT 20
  `, [startDate, endDate]);

  const customerTypeAnalysis = await db.allAsync(`
    SELECT 
      c.customer_type,
      COUNT(DISTINCT c.id) as customer_count,
      COUNT(DISTINCT so.id) as order_count,
      SUM(soi.total_price) as revenue,
      AVG(soi.total_price) as avg_order_value
    FROM customers c
    JOIN sales_orders so ON c.id = so.customer_id
    JOIN sales_order_items soi ON so.id = soi.order_id
    WHERE so.order_date BETWEEN ? AND ?
      AND so.status != 'cancelled'
    GROUP BY c.customer_type
  `, [startDate, endDate]);

  return {
    topCustomers,
    customerTypeAnalysis,
    period: { startDate, endDate }
  };
}

async function getByRegion(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

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

  return {
    regionalBreakdown: regionsWithGrowth,
    period: { startDate, endDate }
  };
}

async function getForecast(req, res) {
  const db = getDb();
  const { periods = 3 } = req.query;
  
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
  
  return {
    historical: historicalData,
    forecast: forecast,
    method: 'Linear Trend',
    confidence_level: 90
  };
}

async function getReceivables(req, res) {
  const db = getDb();
  
  const outstanding = await db.allAsync(`
    SELECT 
      so.order_number,
      c.name as customer_name,
      so.total_amount,
      so.order_date,
      so.payment_due_date,
      JULIANDAY('now') - JULIANDAY(so.payment_due_date) as days_overdue
    FROM sales_orders so
    JOIN customers c ON so.customer_id = c.id
    WHERE so.payment_status IN ('pending', 'partial', 'overdue')
      AND so.status = 'delivered'
    ORDER BY days_overdue DESC
  `);

  const summary = await db.getAsync(`
    SELECT 
      COUNT(*) as total_invoices,
      SUM(total_amount) as total_outstanding,
      SUM(CASE WHEN JULIANDAY('now') > JULIANDAY(payment_due_date) THEN total_amount ELSE 0 END) as overdue_amount,
      AVG(JULIANDAY('now') - JULIANDAY(order_date)) as avg_days_outstanding
    FROM sales_orders
    WHERE payment_status IN ('pending', 'partial', 'overdue')
      AND status = 'delivered'
  `);

  const aging = await db.allAsync(`
    SELECT 
      CASE 
        WHEN JULIANDAY('now') - JULIANDAY(payment_due_date) <= 0 THEN 'Current'
        WHEN JULIANDAY('now') - JULIANDAY(payment_due_date) <= 30 THEN '1-30 days'
        WHEN JULIANDAY('now') - JULIANDAY(payment_due_date) <= 60 THEN '31-60 days'
        WHEN JULIANDAY('now') - JULIANDAY(payment_due_date) <= 90 THEN '61-90 days'
        ELSE 'Over 90 days'
      END as aging_bucket,
      COUNT(*) as count,
      SUM(total_amount) as amount
    FROM sales_orders
    WHERE payment_status IN ('pending', 'partial', 'overdue')
      AND status = 'delivered'
    GROUP BY aging_bucket
    ORDER BY 
      CASE aging_bucket
        WHEN 'Current' THEN 1
        WHEN '1-30 days' THEN 2
        WHEN '31-60 days' THEN 3
        WHEN '61-90 days' THEN 4
        ELSE 5
      END
  `);

  return {
    summary: {
      total_outstanding: summary.total_outstanding || 0,
      overdue_amount: summary.overdue_amount || 0,
      overdue_percentage: calculatePercentage(summary.overdue_amount, summary.total_outstanding),
      days_sales_outstanding: Math.round(summary.avg_days_outstanding || 0),
      total_invoices: summary.total_invoices || 0
    },
    aging: aging,
    items: outstanding
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
      case 'by-product':
        result = await getByProduct(req, res);
        break;
      case 'by-customer':
        result = await getByCustomer(req, res);
        break;
      case 'by-region':
        result = await getByRegion(req, res);
        break;
      case 'forecast':
        result = await getForecast(req, res);
        break;
      case 'receivables':
        result = await getReceivables(req, res);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in sales handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}