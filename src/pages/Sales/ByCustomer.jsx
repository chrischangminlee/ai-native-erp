import { useState, useEffect } from 'react';
import { salesAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';

function ByCustomer() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesAPI.getByCustomer(period);
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to fetch customer sales data');
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

  const { topCustomers, customerTypeAnalysis } = data;

  const customerColumns = [
    { key: 'code', label: 'Customer Code', sortable: true },
    { key: 'name', label: 'Customer Name', sortable: true },
    { key: 'region', label: 'Region', sortable: true },
    { key: 'customer_type', label: 'Type', sortable: true },
    { key: 'order_count', label: 'Orders', format: 'number', sortable: true },
    { key: 'revenue', label: 'Revenue', format: 'currency', sortable: true },
    { 
      key: 'avg_reorder_days', 
      label: 'Avg Reorder Cycle', 
      sortable: true,
      render: (value) => value ? `${Math.round(value)} days` : 'N/A'
    },
  ];

  // Calculate summary metrics
  const totalCustomers = customerTypeAnalysis.reduce((sum, type) => sum + type.customer_count, 0);
  const newCustomerRatio = customerTypeAnalysis.find(t => t.customer_type === 'new')?.customer_count || 0;
  const repeatRevenue = customerTypeAnalysis.find(t => t.customer_type === 'repeat')?.revenue || 0;
  const totalRevenue = customerTypeAnalysis.reduce((sum, type) => sum + type.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Sales by Customer</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Customer Type Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Customers"
          value={totalCustomers}
          format="number"
        />
        <KPICard
          title="New Customer Ratio"
          value={(newCustomerRatio / totalCustomers * 100).toFixed(1)}
          format="percentage"
        />
        <KPICard
          title="Repeat Customer Revenue"
          value={repeatRevenue}
          format="currency"
        />
        <KPICard
          title="Revenue per Customer"
          value={totalRevenue / totalCustomers}
          format="currency"
        />
      </div>

      {/* Customer Type Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {customerTypeAnalysis.map((type) => (
          <div key={type.customer_type} className="bg-white rounded-lg shadow p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
              {type.customer_type} Customers
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Customer Count:</span>
                <span className="font-medium">{type.customer_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Orders:</span>
                <span className="font-medium">{type.order_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Revenue:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(type.revenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Order Value:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(type.avg_order_value)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Customers Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
        <DataTable
          columns={customerColumns}
          data={topCustomers}
          pageSize={20}
        />
      </div>
    </div>
  );
}

export default ByCustomer;