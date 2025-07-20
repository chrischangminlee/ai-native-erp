import { getDb } from '../_lib/db.js';
import { getDateRange, calculatePercentage, calculateYoY } from '../_lib/helpers.js';
import '../_lib/init-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    const { period = 'current-month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // P&L Summary
    const plSummary = await db.getAsync(`
      SELECT 
        SUM(CASE WHEN account_type = 'revenue' THEN amount ELSE 0 END) as revenue,
        SUM(CASE WHEN account_type = 'cogs' THEN amount ELSE 0 END) as cogs,
        SUM(CASE WHEN account_type = 'expense' THEN amount ELSE 0 END) as operating_expenses
      FROM financial_transactions
      WHERE transaction_date BETWEEN ? AND ?
    `, [startDate, endDate]);

    const grossProfit = plSummary.revenue - plSummary.cogs;
    const ebit = grossProfit - plSummary.operating_expenses;
    const taxRate = 0.25; // Assumed tax rate
    const netProfit = ebit * (1 - taxRate);

    // Previous period for comparison
    const prevStartDate = `${parseInt(startDate.substring(0, 4)) - 1}${startDate.substring(4)}`;
    const prevEndDate = `${parseInt(endDate.substring(0, 4)) - 1}${endDate.substring(4)}`;
    
    const prevPlSummary = await db.getAsync(`
      SELECT 
        SUM(CASE WHEN account_type = 'revenue' THEN amount ELSE 0 END) as revenue,
        SUM(CASE WHEN account_type = 'cogs' THEN amount ELSE 0 END) as cogs
      FROM financial_transactions
      WHERE transaction_date BETWEEN ? AND ?
    `, [prevStartDate, prevEndDate]);

    const prevGrossProfit = prevPlSummary.revenue - prevPlSummary.cogs;

    // Monthly trend
    const monthlyPL = await db.allAsync(`
      SELECT 
        strftime('%Y-%m', transaction_date) as month,
        SUM(CASE WHEN account_type = 'revenue' THEN amount ELSE 0 END) as revenue,
        SUM(CASE WHEN account_type = 'cogs' THEN amount ELSE 0 END) as cogs,
        SUM(CASE WHEN account_type = 'expense' THEN amount ELSE 0 END) as expenses
      FROM financial_transactions
      WHERE transaction_date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month
    `);

    const monthlyPLWithMargins = monthlyPL.map(month => ({
      month: month.month,
      revenue: month.revenue,
      gross_profit: month.revenue - month.cogs,
      net_profit: (month.revenue - month.cogs - month.expenses) * (1 - taxRate),
      gross_margin: calculatePercentage(month.revenue - month.cogs, month.revenue),
      net_margin: calculatePercentage((month.revenue - month.cogs - month.expenses) * (1 - taxRate), month.revenue)
    }));

    res.status(200).json({
      kpis: {
        revenue: {
          value: plSummary.revenue || 0,
          yoy: calculateYoY(plSummary.revenue, prevPlSummary.revenue),
          label: 'Revenue'
        },
        cogs: {
          value: plSummary.cogs || 0,
          label: 'Cost of Goods Sold'
        },
        gross_profit: {
          value: grossProfit,
          yoy: calculateYoY(grossProfit, prevGrossProfit),
          label: 'Gross Profit'
        },
        gross_margin: {
          value: calculatePercentage(grossProfit, plSummary.revenue),
          label: 'Gross Margin %'
        },
        ebit: {
          value: ebit,
          label: 'EBIT'
        },
        net_profit: {
          value: netProfit,
          label: 'Net Profit'
        },
        net_margin: {
          value: calculatePercentage(netProfit, plSummary.revenue),
          label: 'Net Margin %'
        }
      },
      trend: monthlyPLWithMargins,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getDashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}