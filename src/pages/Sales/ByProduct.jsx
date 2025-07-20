import { useState, useEffect } from 'react';
import { salesAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';

function ByProduct() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesAPI.getByProduct(period);
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to fetch product sales data');
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

  const { topProducts, categoryBreakdown } = data;

  const productColumns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'name', label: 'Product Name', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'units_sold', label: 'Units Sold', format: 'number', sortable: true },
    { key: 'revenue', label: 'Revenue', format: 'currency', sortable: true },
    { key: 'gross_profit', label: 'Gross Profit', format: 'currency', sortable: true },
    { key: 'margin_percentage', label: 'Margin %', format: 'percentage', sortable: true },
  ];

  const categoryColumns = [
    { key: 'category', label: 'Category', sortable: true },
    { key: 'product_count', label: 'Products', format: 'number', sortable: true },
    { key: 'units_sold', label: 'Units Sold', format: 'number', sortable: true },
    { key: 'revenue', label: 'Revenue', format: 'currency', sortable: true },
  ];

  // Prepare data for category revenue chart
  const categoryChartData = categoryBreakdown.map(cat => ({
    category: cat.category,
    revenue: cat.revenue
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">제품별 매출</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Category Revenue Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
        <TrendChart
          data={categoryChartData}
          type="bar"
          dataKeys={[{ dataKey: 'revenue', name: 'Revenue' }]}
          xDataKey="category"
          formatYAxis="currency"
          height={300}
          colors={['#3B82F6']}
        />
      </div>

      {/* Top Products Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
        <DataTable
          columns={productColumns}
          data={topProducts}
          pageSize={15}
        />
      </div>

      {/* Category Summary Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Summary</h3>
        <DataTable
          columns={categoryColumns}
          data={categoryBreakdown}
          showPagination={false}
        />
      </div>
    </div>
  );
}

export default ByProduct;