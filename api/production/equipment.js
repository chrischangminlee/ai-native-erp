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

    res.status(200).json({
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