import { useState, useEffect } from 'react';
import { salesAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';

function ByRegion() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesAPI.getByRegion(period);
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to fetch regional sales data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;
  if (!data) return null;

  const { regionalBreakdown } = data;

  const regionColumns = [
    { key: 'region', label: 'Region', sortable: true },
    { key: 'country', label: 'Country', sortable: true },
    { key: 'customer_count', label: 'Customers', format: 'number', sortable: true },
    { key: 'order_count', label: 'Orders', format: 'number', sortable: true },
    { key: 'revenue', label: 'Revenue', format: 'currency', sortable: true },
    { 
      key: 'growth_rate', 
      label: 'YoY Growth', 
      format: 'percentage', 
      sortable: true,
      render: (value) => {
        const numValue = parseFloat(value);
        const color = numValue > 0 ? 'text-green-600' : numValue < 0 ? 'text-red-600' : 'text-gray-600';
        return <span className={color}>{value}%</span>;
      }
    },
  ];

  // Group by region for chart
  const regionSummary = regionalBreakdown.reduce((acc, item) => {
    const existing = acc.find(r => r.region === item.region);
    if (existing) {
      existing.revenue += item.revenue;
      existing.orders += item.order_count;
    } else {
      acc.push({
        region: item.region,
        revenue: item.revenue,
        orders: item.order_count
      });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Sales by Region</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Regional Revenue Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Region</h3>
        <TrendChart
          data={regionSummary}
          type="bar"
          dataKeys={[{ dataKey: 'revenue', name: 'Revenue' }]}
          xDataKey="region"
          formatYAxis="currency"
          height={300}
          colors={['#8B5CF6']}
        />
      </div>

      {/* Regional Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {regionSummary.map((region) => (
          <div key={region.region} className="bg-white rounded-lg shadow p-6">
            <h4 className="text-sm font-medium text-gray-600 mb-2">{region.region}</h4>
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(region.revenue)}
            </p>
            <p className="text-sm text-gray-500 mt-1">{region.orders} orders</p>
          </div>
        ))}
      </div>

      {/* Detailed Regional Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Details</h3>
        <DataTable
          columns={regionColumns}
          data={regionalBreakdown}
          pageSize={20}
        />
      </div>
    </div>
  );
}

export default ByRegion;