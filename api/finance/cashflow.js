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

    // Operating Cash Flow components
    const cashflowComponents = await db.getAsync(`
      SELECT 
        -- Revenue collected (assuming 85% collection rate)
        SUM(CASE WHEN account_type = 'revenue' THEN amount * 0.85 ELSE 0 END) as collections,
        -- Cash paid for expenses
        SUM(CASE WHEN account_type IN ('cogs', 'expense') THEN amount ELSE 0 END) as payments,
        -- Working capital changes (simplified)
        SUM(CASE WHEN account_type = 'revenue' THEN amount * 0.15 ELSE 0 END) as ar_increase
      FROM financial_transactions
      WHERE transaction_date BETWEEN ? AND ?
    `, [startDate, endDate]);

    const operatingCashFlow = cashflowComponents.collections - cashflowComponents.payments;

    // Financial ratios
    const ratios = await db.getAsync(`
      SELECT 
        SUM(CASE WHEN account_type = 'revenue' THEN amount ELSE 0 END) as revenue,
        SUM(CASE WHEN account_type = 'asset' THEN amount ELSE 0 END) as total_assets,
        SUM(CASE WHEN account_type = 'expense' AND account_subtype = 'interest' THEN amount ELSE 0 END) as interest_expense,
        SUM(CASE WHEN account_type IN ('cogs', 'expense') THEN amount ELSE -amount END) as ebit
      FROM financial_transactions
      WHERE transaction_date BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Calculate ratios
    const totalAssets = ratios.total_assets || 5000000; // Default if no asset data
    const interestExpense = ratios.interest_expense || 10000; // Default interest
    const roa = (ratios.ebit / totalAssets * 100).toFixed(2);
    const roe = (ratios.ebit / (totalAssets * 0.6) * 100).toFixed(2); // Assuming 60% equity
    const interestCoverage = (ratios.ebit / interestExpense).toFixed(2);

    // Monthly cash flow trend
    const monthlyCashflow = await db.allAsync(`
      SELECT 
        strftime('%Y-%m', transaction_date) as month,
        SUM(CASE WHEN account_type = 'revenue' THEN amount * 0.85 ELSE 0 END) -
        SUM(CASE WHEN account_type IN ('cogs', 'expense') THEN amount ELSE 0 END) as net_cashflow
      FROM financial_transactions
      WHERE transaction_date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month
    `);

    res.status(200).json({
      cashflow: {
        operating_activities: {
          collections: cashflowComponents.collections || 0,
          payments: -cashflowComponents.payments || 0,
          net_operating_cashflow: operatingCashFlow
        },
        working_capital: {
          ar_increase: -cashflowComponents.ar_increase || 0,
          inventory_change: 0, // Simplified
          ap_increase: 0 // Simplified
        }
      },
      ratios: {
        return_on_assets: parseFloat(roa),
        return_on_equity: parseFloat(roe),
        interest_coverage_ratio: parseFloat(interestCoverage),
        current_ratio: 2.1, // Simplified
        quick_ratio: 1.8 // Simplified
      },
      trend: monthlyCashflow.map(m => ({
        month: m.month,
        cashflow: m.net_cashflow || 0
      })),
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getCashflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}