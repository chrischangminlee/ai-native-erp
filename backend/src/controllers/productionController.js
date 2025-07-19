import { getDb } from '../db/database.js';
import { getDateRange, calculatePercentage, groupByMonth } from '../utils/helpers.js';

const db = getDb();

export async function getOutput(req, res) {
  try {
    const { period = 'current-month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Monthly production output
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

    // Current period summary
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

    // Product-wise output
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

    res.json({
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
    });
  } catch (error) {
    console.error('Error in getOutput:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getByProcess(req, res) {
  try {
    const { period = 'current-month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Process performance metrics
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

    // Calculate OEE components
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

    // Identify bottlenecks
    const bottlenecks = oeeData
      .filter(p => p.efficiency_percentage < 80 && p.order_count > 0)
      .sort((a, b) => a.efficiency_percentage - b.efficiency_percentage)
      .slice(0, 5);

    res.json({
      processPerformance: oeeData,
      bottlenecks,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getByProcess:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUsage(req, res) {
  try {
    const { period = 'current-month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Material usage analysis
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

    // BOM vs Actual comparison
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

    // Summary metrics
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

    res.json({
      materialUsage,
      bomVariance,
      summary: {
        total_material_cost: usageSummary.total_material_cost || 0,
        avg_variance_percentage: parseFloat(usageSummary.avg_absolute_variance || 0).toFixed(2),
        material_overuse_cost: usageSummary.overuse_cost || 0
      },
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getUsage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getDefects(req, res) {
  try {
    const { period = 'current-month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Defect analysis
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

    // Defect rate by product
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

    // Summary metrics
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

    // Monthly trend
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

    res.json({
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
    });
  } catch (error) {
    console.error('Error in getDefects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getEquipment(req, res) {
  try {
    const { period = 'current-month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Equipment utilization
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

    // Maintenance compliance
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

    // Asset depreciation
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

    res.json({
      equipmentUtilization: equipmentUtil,
      maintenanceCompliance,
      assetValue: assetValue.slice(0, 20),
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getEquipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getWIP(req, res) {
  try {
    // Current WIP status
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

    // WIP by stage/process
    const wipByStage = await db.allAsync(`
      SELECT 
        pp.name as stage,
        COUNT(po.id) as order_count,
        SUM(po.planned_quantity) as total_quantity,
        AVG(JULIANDAY('now') - JULIANDAY(po.actual_start_date)) as avg_days_in_stage
      FROM production_orders po
      JOIN production_processes pp ON po.process_id = pp.id
      WHERE po.status = 'in_progress'
      GROUP BY pp.id, pp.name
    `);

    // Lead time analysis
    const leadTimeStats = await db.getAsync(`
      SELECT 
        AVG(JULIANDAY(actual_end_date) - JULIANDAY(actual_start_date)) as avg_lead_time,
        MIN(JULIANDAY(actual_end_date) - JULIANDAY(actual_start_date)) as min_lead_time,
        MAX(JULIANDAY(actual_end_date) - JULIANDAY(actual_start_date)) as max_lead_time,
        COUNT(*) as completed_orders
      FROM production_orders
      WHERE status = 'completed'
        AND actual_end_date >= date('now', '-30 days')
    `);

    // Calculate WIP value
    const wipValue = await db.getAsync(`
      SELECT 
        SUM(po.planned_quantity * p.unit_cost) as total_wip_value
      FROM production_orders po
      JOIN products p ON po.product_id = p.id
      WHERE po.status = 'in_progress'
    `);

    res.json({
      currentWIP,
      wipByStage,
      summary: {
        total_wip_orders: currentWIP.length,
        total_wip_value: wipValue.total_wip_value || 0,
        avg_lead_time_days: parseFloat(leadTimeStats.avg_lead_time || 0).toFixed(1),
        min_lead_time_days: parseFloat(leadTimeStats.min_lead_time || 0).toFixed(1),
        max_lead_time_days: parseFloat(leadTimeStats.max_lead_time || 0).toFixed(1)
      }
    });
  } catch (error) {
    console.error('Error in getWIP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}