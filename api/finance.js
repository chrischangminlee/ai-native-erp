import { getDb } from '../lib/db.js';
import { getDateRange, calculatePercentage, calculateYoY } from '../lib/helpers.js';
import '../lib/init-db.js';

async function getDashboard(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

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
  const taxRate = 0.25;
  const netProfit = ebit * (1 - taxRate);

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

  return {
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
  };
}

async function getByDepartment(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const deptPL = await db.allAsync(`
    SELECT 
      d.code,
      d.name,
      d.cost_center,
      SUM(CASE WHEN ft.account_type = 'revenue' THEN ft.amount ELSE 0 END) as revenue,
      SUM(CASE WHEN ft.account_type IN ('cogs', 'expense') THEN ft.amount ELSE 0 END) as costs,
      SUM(CASE WHEN ft.account_type = 'revenue' THEN ft.amount ELSE -ft.amount END) as contribution
    FROM departments d
    LEFT JOIN financial_transactions ft ON d.id = ft.department_id
      AND ft.transaction_date BETWEEN ? AND ?
    GROUP BY d.id, d.code, d.name, d.cost_center
    ORDER BY contribution DESC
  `, [startDate, endDate]);

  const deptCostBreakdown = await db.allAsync(`
    SELECT 
      d.name as department,
      ft.account_subtype,
      SUM(ft.amount) as amount
    FROM financial_transactions ft
    JOIN departments d ON ft.department_id = d.id
    WHERE ft.transaction_date BETWEEN ? AND ?
      AND ft.account_type IN ('cogs', 'expense')
    GROUP BY d.id, d.name, ft.account_subtype
    ORDER BY d.name, amount DESC
  `, [startDate, endDate]);

  return {
    departmentPL: deptPL,
    costBreakdown: deptCostBreakdown,
    period: { startDate, endDate }
  };
}

async function getByProduct(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const productPL = await db.allAsync(`
    SELECT 
      p.sku,
      p.name,
      p.category,
      SUM(soi.total_price) as revenue,
      SUM(soi.quantity * p.unit_cost) as cogs,
      SUM(soi.total_price - soi.quantity * p.unit_cost) as gross_profit,
      AVG((soi.total_price - soi.quantity * p.unit_cost) / NULLIF(soi.total_price, 0) * 100) as gross_margin
    FROM sales_order_items soi
    JOIN products p ON soi.product_id = p.id
    JOIN sales_orders so ON soi.order_id = so.id
    WHERE so.order_date BETWEEN ? AND ?
      AND so.status != 'cancelled'
    GROUP BY p.id, p.sku, p.name, p.category
    ORDER BY gross_profit DESC
    LIMIT 30
  `, [startDate, endDate]);

  const totalRevenue = productPL.reduce((sum, p) => sum + p.revenue, 0);
  const productEBITDA = productPL.map(product => {
    const revenueShare = product.revenue / totalRevenue;
    const allocatedOpex = revenueShare * 50000;
    const ebitda = product.gross_profit - allocatedOpex;
    
    return {
      ...product,
      ebitda,
      ebitda_margin: calculatePercentage(ebitda, product.revenue)
    };
  });

  const categoryProfit = await db.allAsync(`
    SELECT 
      p.category,
      COUNT(DISTINCT p.id) as product_count,
      SUM(soi.total_price) as revenue,
      SUM(soi.total_price - soi.quantity * p.unit_cost) as gross_profit,
      AVG((soi.total_price - soi.quantity * p.unit_cost) / NULLIF(soi.total_price, 0) * 100) as avg_margin
    FROM sales_order_items soi
    JOIN products p ON soi.product_id = p.id
    JOIN sales_orders so ON soi.order_id = so.id
    WHERE so.order_date BETWEEN ? AND ?
      AND so.status != 'cancelled'
    GROUP BY p.category
    ORDER BY gross_profit DESC
  `, [startDate, endDate]);

  return {
    productPL: productEBITDA,
    categoryProfitability: categoryProfit,
    period: { startDate, endDate }
  };
}

async function getCostStructure(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const costStructure = await db.allAsync(`
    SELECT 
      CASE 
        WHEN is_fixed_cost = 1 THEN 'Fixed Costs'
        ELSE 'Variable Costs'
      END as cost_type,
      account_subtype,
      SUM(amount) as total_amount
    FROM financial_transactions
    WHERE transaction_date BETWEEN ? AND ?
      AND account_type IN ('cogs', 'expense')
    GROUP BY is_fixed_cost, account_subtype
    ORDER BY is_fixed_cost DESC, total_amount DESC
  `, [startDate, endDate]);

  const costSummary = await db.getAsync(`
    SELECT 
      SUM(CASE WHEN is_fixed_cost = 1 THEN amount ELSE 0 END) as fixed_costs,
      SUM(CASE WHEN is_fixed_cost = 0 THEN amount ELSE 0 END) as variable_costs,
      SUM(amount) as total_costs
    FROM financial_transactions
    WHERE transaction_date BETWEEN ? AND ?
      AND account_type IN ('cogs', 'expense')
  `, [startDate, endDate]);

  const monthlyStructure = await db.allAsync(`
    SELECT 
      strftime('%Y-%m', transaction_date) as month,
      SUM(CASE WHEN is_fixed_cost = 1 THEN amount ELSE 0 END) as fixed_costs,
      SUM(CASE WHEN is_fixed_cost = 0 THEN amount ELSE 0 END) as variable_costs
    FROM financial_transactions
    WHERE transaction_date >= date('now', '-12 months')
      AND account_type IN ('cogs', 'expense')
    GROUP BY strftime('%Y-%m', transaction_date)
    ORDER BY month
  `);

  return {
    costBreakdown: costStructure,
    summary: {
      fixed_costs: costSummary.fixed_costs || 0,
      variable_costs: costSummary.variable_costs || 0,
      total_costs: costSummary.total_costs || 0,
      fixed_percentage: calculatePercentage(costSummary.fixed_costs, costSummary.total_costs),
      variable_percentage: calculatePercentage(costSummary.variable_costs, costSummary.total_costs)
    },
    trend: monthlyStructure,
    period: { startDate, endDate }
  };
}

async function getVariance(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const materialVariance = await db.allAsync(`
    SELECT 
      p.sku,
      p.name,
      p.unit_cost as standard_cost,
      AVG(soi.unit_price - soi.margin / NULLIF(soi.quantity, 0)) as actual_cost,
      AVG((soi.unit_price - soi.margin / NULLIF(soi.quantity, 0)) - p.unit_cost) as variance_amount,
      AVG(((soi.unit_price - soi.margin / NULLIF(soi.quantity, 0)) - p.unit_cost) / NULLIF(p.unit_cost, 0) * 100) as variance_percentage,
      SUM(soi.quantity) as quantity_sold
    FROM sales_order_items soi
    JOIN products p ON soi.product_id = p.id
    JOIN sales_orders so ON soi.order_id = so.id
    WHERE so.order_date BETWEEN ? AND ?
      AND so.status != 'cancelled'
    GROUP BY p.id, p.sku, p.name, p.unit_cost
    HAVING ABS(variance_percentage) > 5
    ORDER BY ABS(variance_amount * quantity_sold) DESC
    LIMIT 20
  `, [startDate, endDate]);

  const efficiencyVariance = await db.allAsync(`
    SELECT 
      pp.name as process_name,
      pp.standard_cycle_time,
      AVG(CAST((JULIANDAY(po.actual_end_date) - JULIANDAY(po.actual_start_date)) * 24 * 60 AS REAL)) as actual_cycle_time,
      COUNT(po.id) as order_count,
      AVG(po.yield_percentage) as avg_yield
    FROM production_processes pp
    JOIN production_orders po ON pp.id = po.process_id
    WHERE po.actual_end_date BETWEEN ? AND ?
      AND po.status = 'completed'
    GROUP BY pp.id, pp.name, pp.standard_cycle_time
  `, [startDate, endDate]);

  const totalMaterialVariance = materialVariance.reduce((sum, item) => 
    sum + (item.variance_amount * item.quantity_sold), 0
  );

  const efficiencyImpact = efficiencyVariance.reduce((sum, process) => {
    const timeVariance = (process.actual_cycle_time - process.standard_cycle_time) / 60;
    const laborCostPerHour = 25;
    return sum + (timeVariance * laborCostPerHour * process.order_count);
  }, 0);

  return {
    materialVariance,
    processVariance: efficiencyVariance.map(p => ({
      ...p,
      time_variance: p.actual_cycle_time - p.standard_cycle_time,
      efficiency: (p.standard_cycle_time / p.actual_cycle_time * 100).toFixed(2)
    })),
    savingsPotential: {
      material_variance_impact: Math.abs(totalMaterialVariance),
      efficiency_variance_impact: Math.abs(efficiencyImpact),
      total_savings_potential: Math.abs(totalMaterialVariance) + Math.abs(efficiencyImpact)
    },
    period: { startDate, endDate }
  };
}

async function getCashflow(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const cashflowComponents = await db.getAsync(`
    SELECT 
      SUM(CASE WHEN account_type = 'revenue' THEN amount * 0.85 ELSE 0 END) as collections,
      SUM(CASE WHEN account_type IN ('cogs', 'expense') THEN amount ELSE 0 END) as payments,
      SUM(CASE WHEN account_type = 'revenue' THEN amount * 0.15 ELSE 0 END) as ar_increase
    FROM financial_transactions
    WHERE transaction_date BETWEEN ? AND ?
  `, [startDate, endDate]);

  const operatingCashFlow = cashflowComponents.collections - cashflowComponents.payments;

  const ratios = await db.getAsync(`
    SELECT 
      SUM(CASE WHEN account_type = 'revenue' THEN amount ELSE 0 END) as revenue,
      SUM(CASE WHEN account_type = 'asset' THEN amount ELSE 0 END) as total_assets,
      SUM(CASE WHEN account_type = 'expense' AND account_subtype = 'interest' THEN amount ELSE 0 END) as interest_expense,
      SUM(CASE WHEN account_type IN ('cogs', 'expense') THEN amount ELSE -amount END) as ebit
    FROM financial_transactions
    WHERE transaction_date BETWEEN ? AND ?
  `, [startDate, endDate]);

  const totalAssets = ratios.total_assets || 5000000;
  const interestExpense = ratios.interest_expense || 10000;
  const roa = (ratios.ebit / totalAssets * 100).toFixed(2);
  const roe = (ratios.ebit / (totalAssets * 0.6) * 100).toFixed(2);
  const interestCoverage = (ratios.ebit / interestExpense).toFixed(2);

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

  return {
    cashflow: {
      operating_activities: {
        collections: cashflowComponents.collections || 0,
        payments: -cashflowComponents.payments || 0,
        net_operating_cashflow: operatingCashFlow
      },
      working_capital: {
        ar_increase: -cashflowComponents.ar_increase || 0,
        inventory_change: 0,
        ap_increase: 0
      }
    },
    ratios: {
      return_on_assets: parseFloat(roa),
      return_on_equity: parseFloat(roe),
      interest_coverage_ratio: parseFloat(interestCoverage),
      current_ratio: 2.1,
      quick_ratio: 1.8
    },
    trend: monthlyCashflow.map(m => ({
      month: m.month,
      cashflow: m.net_cashflow || 0
    })),
    period: { startDate, endDate }
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
      case 'by-dept':
        result = await getByDepartment(req, res);
        break;
      case 'by-product':
        result = await getByProduct(req, res);
        break;
      case 'cost-structure':
        result = await getCostStructure(req, res);
        break;
      case 'variance':
        result = await getVariance(req, res);
        break;
      case 'cashflow':
        result = await getCashflow(req, res);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in finance handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}