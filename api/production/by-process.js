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

    res.status(200).json({
      processPerformance: oeeData,
      bottlenecks,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error in getByProcess:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}