import { getDb } from '../_lib/db.js';
import { calculatePercentage } from '../_lib/helpers.js';
import '../_lib/init-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    
    // Outstanding receivables
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

    // Summary metrics
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

    // Aging buckets
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

    res.status(200).json({
      summary: {
        total_outstanding: summary.total_outstanding || 0,
        overdue_amount: summary.overdue_amount || 0,
        overdue_percentage: calculatePercentage(summary.overdue_amount, summary.total_outstanding),
        days_sales_outstanding: Math.round(summary.avg_days_outstanding || 0),
        total_invoices: summary.total_invoices || 0
      },
      aging: aging,
      items: outstanding
    });
  } catch (error) {
    console.error('Error in getReceivables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}