import { getDb } from '../lib/db.js';
import { getDateRange, calculatePercentage } from '../lib/helpers.js';
import '../lib/init-db.js';

async function getOutput(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const monthlyOutput = await db.allAsync(`
    SELECT 
      strftime('%Y-%m', po.actual_end_date) as month,
      COUNT(*) as order_count,
      SUM(po.planned_quantity) as planned_quantity,
      SUM(po.actual_quantity) as actual_quantity,
      AVG(po.yield_percentage) as avg_yield,
      SUM(CASE WHEN po.status = 'completed' THEN 1 ELSE 0 END) as completed_orders
    FROM production_orders po
    WHERE po.actual_end_date BETWEEN ? AND ?
    GROUP BY strftime('%Y-%m', po.actual_end_date)
    ORDER BY month
  `, [startDate, endDate]);

  const periodSummary = await db.getAsync(`
    SELECT 
      COUNT(*) as total_orders,
      SUM(planned_quantity) as total_planned,
      SUM(actual_quantity) as total_actual,
      AVG(yield_percentage) as overall_yield,
      SUM(CASE WHEN actual_quantity >= planned_quantity THEN 1 ELSE 0 END) as on_target_orders
    FROM production_orders
    WHERE actual_end_date BETWEEN ? AND ?
      AND status = 'completed'
  `, [startDate, endDate]);

  const productOutput = await db.allAsync(`
    SELECT 
      p.sku,
      p.name,
      p.category,
      COUNT(po.id) as production_runs,
      SUM(po.actual_quantity) as total_produced,
      AVG(po.yield_percentage) as avg_yield
    FROM production_orders po
    JOIN products p ON po.product_id = p.id
    WHERE po.actual_end_date BETWEEN ? AND ?
      AND po.status = 'completed'
    GROUP BY p.id, p.sku, p.name, p.category
    ORDER BY total_produced DESC
    LIMIT 20
  `, [startDate, endDate]);

  return {
    kpis: {
      total_output: {
        value: periodSummary.total_actual || 0,
        label: 'Total Units Produced'
      },
      plan_achievement: {
        value: calculatePercentage(periodSummary.total_actual, periodSummary.total_planned),
        label: 'Plan Achievement %'
      },
      average_yield: {
        value: parseFloat(periodSummary.overall_yield || 0).toFixed(2),
        label: 'Average Yield %'
      },
      on_target_rate: {
        value: calculatePercentage(periodSummary.on_target_orders, periodSummary.total_orders),
        label: 'On-Target Orders %'
      }
    },
    monthlyTrend: monthlyOutput,
    topProducts: productOutput,
    period: { startDate, endDate }
  };
}

async function getByProcess(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const processMetrics = await db.allAsync(`
    SELECT 
      pp.code,
      pp.name,
      pp.standard_cycle_time,
      COUNT(po.id) as order_count,
      AVG(
        CAST((JULIANDAY(po.actual_end_date) - JULIANDAY(po.actual_start_date)) * 24 * 60 AS REAL)
      ) as actual_cycle_time,
      MIN(
        CAST((JULIANDAY(po.actual_end_date) - JULIANDAY(po.actual_start_date)) * 24 * 60 AS REAL)
      ) as min_cycle_time,
      MAX(
        CAST((JULIANDAY(po.actual_end_date) - JULIANDAY(po.actual_start_date)) * 24 * 60 AS REAL)
      ) as max_cycle_time
    FROM production_processes pp
    LEFT JOIN production_orders po ON pp.id = po.process_id
      AND po.actual_end_date BETWEEN ? AND ?
      AND po.status = 'completed'
    GROUP BY pp.id, pp.code, pp.name, pp.standard_cycle_time
  `, [startDate, endDate]);

  const oeeData = processMetrics.map(process => {
    const efficiency = process.standard_cycle_time && process.actual_cycle_time
      ? (process.standard_cycle_time / process.actual_cycle_time * 100).toFixed(2)
      : 0;
    
    return {
      ...process,
      efficiency_percentage: parseFloat(efficiency),
      cycle_time_variance: process.actual_cycle_time 
        ? ((process.actual_cycle_time - process.standard_cycle_time) / process.standard_cycle_time * 100).toFixed(2)
        : 0
    };
  });

  const bottlenecks = oeeData
    .filter(p => p.efficiency_percentage < 80 && p.order_count > 0)
    .sort((a, b) => a.efficiency_percentage - b.efficiency_percentage)
    .slice(0, 5);

  return {
    processPerformance: oeeData,
    bottlenecks,
    period: { startDate, endDate }
  };
}

async function getUsage(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const materialUsage = await db.allAsync(`
    SELECT 
      p.sku as material_sku,
      p.name as material_name,
      p.category,
      SUM(mc.planned_quantity) as total_planned,
      SUM(mc.actual_quantity) as total_actual,
      AVG(mc.variance_percentage) as avg_variance,
      COUNT(DISTINCT mc.production_order_id) as usage_count
    FROM material_consumption mc
    JOIN products p ON mc.material_id = p.id
    JOIN production_orders po ON mc.production_order_id = po.id
    WHERE po.actual_end_date BETWEEN ? AND ?
    GROUP BY p.id, p.sku, p.name, p.category
    ORDER BY total_actual DESC
    LIMIT 30
  `, [startDate, endDate]);

  const bomVariance = await db.allAsync(`
    SELECT 
      prod.sku as product_sku,
      prod.name as product_name,
      mat.sku as material_sku,
      mat.name as material_name,
      AVG(bom.quantity_required) as bom_quantity,
      AVG(mc.actual_quantity / NULLIF(po.actual_quantity, 0)) as actual_per_unit,
      AVG((mc.actual_quantity / NULLIF(po.actual_quantity, 0) - bom.quantity_required) / NULLIF(bom.quantity_required, 0) * 100) as variance_percentage
    FROM bom
    JOIN products prod ON bom.product_id = prod.id
    JOIN products mat ON bom.material_id = mat.id
    LEFT JOIN production_orders po ON po.product_id = prod.id
      AND po.actual_end_date BETWEEN ? AND ?
    LEFT JOIN material_consumption mc ON mc.production_order_id = po.id 
      AND mc.material_id = mat.id
    WHERE po.id IS NOT NULL
    GROUP BY prod.id, mat.id
    HAVING ABS(variance_percentage) > 5
    ORDER BY ABS(variance_percentage) DESC
    LIMIT 20
  `, [startDate, endDate]);

  const usageSummary = await db.getAsync(`
    SELECT 
      SUM(mc.actual_quantity * p.unit_cost) as total_material_cost,
      AVG(ABS(mc.variance_percentage)) as avg_absolute_variance,
      SUM(CASE WHEN mc.variance_percentage > 0 THEN 
        mc.actual_quantity - mc.planned_quantity 
      ELSE 0 END * p.unit_cost) as overuse_cost
    FROM material_consumption mc
    JOIN products p ON mc.material_id = p.id
    JOIN production_orders po ON mc.production_order_id = po.id
    WHERE po.actual_end_date BETWEEN ? AND ?
  `, [startDate, endDate]);

  return {
    materialUsage,
    bomVariance,
    summary: {
      total_material_cost: usageSummary.total_material_cost || 0,
      avg_variance_percentage: parseFloat(usageSummary.avg_absolute_variance || 0).toFixed(2),
      material_overuse_cost: usageSummary.overuse_cost || 0
    },
    period: { startDate, endDate }
  };
}

async function getDefects(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const defectAnalysis = await db.allAsync(`
    SELECT 
      pd.defect_code,
      pd.defect_description,
      COUNT(*) as occurrence_count,
      SUM(pd.quantity) as total_defect_quantity,
      SUM(pd.quantity * p.unit_cost) as defect_cost
    FROM production_defects pd
    JOIN production_orders po ON pd.production_order_id = po.id
    JOIN products p ON po.product_id = p.id
    WHERE pd.defect_date BETWEEN ? AND ?
    GROUP BY pd.defect_code, pd.defect_description
    ORDER BY occurrence_count DESC
  `, [startDate, endDate]);

  const defectByProduct = await db.allAsync(`
    SELECT 
      p.sku,
      p.name,
      SUM(po.actual_quantity) as total_produced,
      COALESCE(SUM(pd.quantity), 0) as defect_quantity,
      CAST(COALESCE(SUM(pd.quantity), 0) AS REAL) / NULLIF(SUM(po.actual_quantity), 0) * 100 as defect_rate
    FROM production_orders po
    JOIN products p ON po.product_id = p.id
    LEFT JOIN production_defects pd ON po.id = pd.production_order_id
    WHERE po.actual_end_date BETWEEN ? AND ?
      AND po.status = 'completed'
    GROUP BY p.id, p.sku, p.name
    HAVING defect_quantity > 0
    ORDER BY defect_rate DESC
    LIMIT 20
  `, [startDate, endDate]);

  const defectSummary = await db.getAsync(`
    SELECT 
      COUNT(DISTINCT pd.production_order_id) as affected_orders,
      SUM(pd.quantity) as total_defects,
      SUM(pd.quantity * p.unit_cost) as total_scrap_value,
      (SELECT SUM(actual_quantity) FROM production_orders WHERE actual_end_date BETWEEN ? AND ?) as total_production
    FROM production_defects pd
    JOIN production_orders po ON pd.production_order_id = po.id
    JOIN products p ON po.product_id = p.id
    WHERE pd.defect_date BETWEEN ? AND ?
  `, [startDate, endDate, startDate, endDate]);

  const overallDefectRate = defectSummary.total_production > 0
    ? (defectSummary.total_defects / defectSummary.total_production * 100).toFixed(2)
    : 0;

  const monthlyDefectTrend = await db.allAsync(`
    SELECT 
      strftime('%Y-%m', pd.defect_date) as month,
      COUNT(*) as defect_incidents,
      SUM(pd.quantity) as defect_quantity
    FROM production_defects pd
    WHERE pd.defect_date >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', pd.defect_date)
    ORDER BY month
  `);

  return {
    defectCodes: defectAnalysis,
    productDefects: defectByProduct,
    summary: {
      overall_defect_rate: parseFloat(overallDefectRate),
      total_defect_quantity: defectSummary.total_defects || 0,
      scrap_value: defectSummary.total_scrap_value || 0,
      affected_orders: defectSummary.affected_orders || 0
    },
    trend: monthlyDefectTrend,
    period: { startDate, endDate }
  };
}

async function getEquipment(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const equipmentUtil = await db.allAsync(`
    SELECT 
      e.code,
      e.name,
      e.type,
      AVG(eu.runtime_hours) as avg_runtime,
      AVG(eu.downtime_hours) as avg_downtime,
      AVG(eu.maintenance_hours) as avg_maintenance,
      AVG(eu.oee_percentage) as avg_oee,
      SUM(eu.runtime_hours) as total_runtime,
      COUNT(*) as days_tracked
    FROM equipment e
    LEFT JOIN equipment_utilization eu ON e.id = eu.equipment_id
      AND eu.date BETWEEN ? AND ?
    GROUP BY e.id, e.code, e.name, e.type
    ORDER BY avg_oee DESC
  `, [startDate, endDate]);

  const maintenanceCompliance = await db.allAsync(`
    SELECT 
      e.type,
      COUNT(DISTINCT e.id) as equipment_count,
      AVG(CASE WHEN eu.maintenance_hours > 0 THEN 1 ELSE 0 END) * 100 as maintenance_compliance_rate,
      AVG(eu.maintenance_hours) as avg_maintenance_hours
    FROM equipment e
    LEFT JOIN equipment_utilization eu ON e.id = eu.equipment_id
      AND eu.date BETWEEN ? AND ?
    GROUP BY e.type
  `, [startDate, endDate]);

  const assetValue = await db.allAsync(`
    SELECT 
      e.code,
      e.name,
      e.acquisition_cost,
      e.acquisition_date,
      e.depreciation_rate,
      e.acquisition_cost * (1 - e.depreciation_rate / 100 * 
        (JULIANDAY('now') - JULIANDAY(e.acquisition_date)) / 365) as current_value
    FROM equipment e
    ORDER BY current_value DESC
  `);

  return {
    equipmentUtilization: equipmentUtil,
    maintenanceCompliance,
    assetValue: assetValue.slice(0, 20),
    period: { startDate, endDate }
  };
}

async function getWIP(req, res) {
  const db = getDb();
  
  const currentWIP = await db.allAsync(`
    SELECT 
      pp.name as process_name,
      p.sku,
      p.name as product_name,
      po.order_number,
      po.planned_quantity,
      po.planned_start_date,
      po.planned_end_date,
      JULIANDAY('now') - JULIANDAY(po.actual_start_date) as days_in_production,
      CASE 
        WHEN po.actual_start_date IS NULL THEN 'Not Started'
        WHEN JULIANDAY('now') - JULIANDAY(po.planned_end_date) > 0 THEN 'Delayed'
        ELSE 'On Track'
      END as status
    FROM production_orders po
    JOIN products p ON po.product_id = p.id
    JOIN production_processes pp ON po.process_id = pp.id
    WHERE po.status = 'in_progress'
    ORDER BY po.planned_start_date
  `);

  const wipByProcess = await db.allAsync(`
    SELECT 
      pp.name as process_name,
      COUNT(po.id) as order_count,
      SUM(po.planned_quantity) as total_quantity,
      AVG(JULIANDAY('now') - JULIANDAY(po.actual_start_date)) as avg_days_in_process
    FROM production_orders po
    JOIN production_processes pp ON po.process_id = pp.id
    WHERE po.status = 'in_progress'
    GROUP BY pp.id, pp.name
  `);

  const wipValue = await db.getAsync(`
    SELECT 
      COUNT(*) as total_orders,
      SUM(po.planned_quantity * p.unit_cost) as total_wip_value,
      SUM(CASE WHEN JULIANDAY('now') > JULIANDAY(po.planned_end_date) THEN 1 ELSE 0 END) as delayed_orders
    FROM production_orders po
    JOIN products p ON po.product_id = p.id
    WHERE po.status = 'in_progress'
  `);

  const agingBuckets = await db.allAsync(`
    SELECT 
      CASE 
        WHEN JULIANDAY('now') - JULIANDAY(actual_start_date) <= 7 THEN '0-7 days'
        WHEN JULIANDAY('now') - JULIANDAY(actual_start_date) <= 14 THEN '8-14 days'
        WHEN JULIANDAY('now') - JULIANDAY(actual_start_date) <= 30 THEN '15-30 days'
        ELSE 'Over 30 days'
      END as age_bucket,
      COUNT(*) as order_count,
      SUM(planned_quantity * p.unit_cost) as value
    FROM production_orders po
    JOIN products p ON po.product_id = p.id
    WHERE po.status = 'in_progress' 
      AND po.actual_start_date IS NOT NULL
    GROUP BY age_bucket
    ORDER BY 
      CASE age_bucket
        WHEN '0-7 days' THEN 1
        WHEN '8-14 days' THEN 2
        WHEN '15-30 days' THEN 3
        ELSE 4
      END
  `);

  return {
    currentOrders: currentWIP,
    byProcess: wipByProcess,
    summary: {
      total_orders: wipValue.total_orders || 0,
      total_value: wipValue.total_wip_value || 0,
      delayed_orders: wipValue.delayed_orders || 0,
      delayed_percentage: wipValue.total_orders > 0 
        ? ((wipValue.delayed_orders / wipValue.total_orders) * 100).toFixed(2)
        : 0
    },
    aging: agingBuckets
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
      case 'output':
        result = await getOutput(req, res);
        break;
      case 'by-process':
        result = await getByProcess(req, res);
        break;
      case 'usage':
        result = await getUsage(req, res);
        break;
      case 'defects':
        result = await getDefects(req, res);
        break;
      case 'equipment':
        result = await getEquipment(req, res);
        break;
      case 'wip':
        result = await getWIP(req, res);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in production handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}