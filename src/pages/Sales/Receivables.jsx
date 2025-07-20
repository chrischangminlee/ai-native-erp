import { useState, useEffect } from 'react';
import { salesAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import KPICard from '../../components/KPICard';
import TrendChart from '../../components/TrendChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { AlertTriangle } from 'lucide-react';

function Receivables() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesAPI.getReceivables();
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to fetch receivables data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;
  if (!data) return null;

  const { summary, aging, outstanding } = data;

  const outstandingColumns = [
    { key: 'order_number', label: 'Order #', sortable: true },
    { key: 'customer_name', label: 'Customer', sortable: true },
    { key: 'total_amount', label: 'Amount', format: 'currency', sortable: true },
    { 
      key: 'order_date', 
      label: 'Order Date', 
      format: 'date', 
      sortable: true 
    },
    { 
      key: 'payment_due_date', 
      label: 'Due Date', 
      format: 'date', 
      sortable: true 
    },
    { 
      key: 'days_overdue', 
      label: 'Days Overdue', 
      sortable: true,
      format: (value) => {
        const days = Math.round(value);
        if (days <= 0) return <span className="text-green-600">Current</span>;
        const color = days > 60 ? 'text-red-600' : days > 30 ? 'text-amber-600' : 'text-yellow-600';
        return <span className={`font-medium ${color}`}>{days} days</span>;
      }
    },
  ];

  // Prepare aging data for chart
  const agingChartData = aging.map(bucket => ({
    bucket: bucket.aging_bucket,
    amount: bucket.amount,
    count: bucket.count
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Accounts Receivable</h2>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Outstanding"
          value={summary.total_outstanding}
          format="currency"
        />
        <KPICard
          title="Overdue Amount"
          value={summary.overdue_amount}
          format="currency"
        />
        <KPICard
          title="Overdue %"
          value={summary.overdue_percentage}
          format="percentage"
        />
        <KPICard
          title="Days Sales Outstanding"
          value={summary.days_sales_outstanding}
          suffix="days"
        />
      </div>

      {/* Overdue Alert */}
      {summary.overdue_percentage > 20 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">High Overdue Risk</h3>
              <p className="mt-1 text-sm text-red-700">
                {summary.overdue_percentage}% of receivables are overdue. Consider implementing collection procedures
                for accounts over 60 days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Aging Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Analysis</h3>
          <TrendChart
            data={agingChartData}
            type="bar"
            dataKeys={[{ dataKey: 'amount', name: 'Amount' }]}
            xDataKey="bucket"
            formatYAxis="currency"
            height={300}
            colors={['#EF4444']}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Breakdown</h3>
          <div className="bg-white rounded-lg shadow p-6">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-sm font-medium text-gray-700 pb-2">Aging Bucket</th>
                  <th className="text-right text-sm font-medium text-gray-700 pb-2">Count</th>
                  <th className="text-right text-sm font-medium text-gray-700 pb-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {aging.map((bucket) => (
                  <tr key={bucket.aging_bucket}>
                    <td className="py-3 text-sm text-gray-900">{bucket.aging_bucket}</td>
                    <td className="py-3 text-sm text-gray-900 text-right">{bucket.count}</td>
                    <td className="py-3 text-sm text-gray-900 text-right font-medium">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(bucket.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td className="pt-3 text-sm font-medium text-gray-900">Total</td>
                  <td className="pt-3 text-sm font-medium text-gray-900 text-right">
                    {summary.total_invoices}
                  </td>
                  <td className="pt-3 text-sm font-bold text-gray-900 text-right">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(summary.total_outstanding)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Outstanding Invoices Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Outstanding Invoices</h3>
        <DataTable
          columns={outstandingColumns}
          data={outstanding}
          pageSize={20}
        />
      </div>
    </div>
  );
}

export default Receivables;