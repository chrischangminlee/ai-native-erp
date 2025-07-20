import { useState, useEffect } from 'react';
import { financeAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';
import { Package, TrendingUp, DollarSign, PieChart } from 'lucide-react';

function ByProduct() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeAPI.getByProduct(period);
      setData(response);
    } catch (err) {
      setError(err.message || '제품별 수익성 데이터를 불러오는데 실패했습니다');
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

  const { summary, products, profitability_trend, category_analysis } = data;

  const productColumns = [
    { key: 'product_code', label: '제품코드', sortable: true },
    { key: 'product_name', label: '제품명', sortable: true },
    { key: 'category', label: '카테고리', sortable: true },
    { key: 'units_sold', label: '판매수량', format: 'number', sortable: true },
    { key: 'revenue', label: '매출액', format: 'currency', sortable: true },
    { key: 'direct_cost', label: '직접원가', format: 'currency', sortable: true },
    { key: 'indirect_cost', label: '간접원가', format: 'currency', sortable: true },
    { key: 'total_cost', label: '총원가', format: 'currency', sortable: true },
    { key: 'gross_profit', label: '매출총이익', format: 'currency', sortable: true },
    { 
      key: 'gross_margin', 
      label: '매출총이익률',
      format: (value) => {
        const color = value >= 30 ? 'text-green-600' : value >= 20 ? 'text-yellow-600' : 'text-red-600';
        return <span className={`font-medium ${color}`}>{value}%</span>;
      },
      sortable: true
    },
    { key: 'contribution_margin', label: '공헌이익', format: 'currency', sortable: true },
    { 
      key: 'profitability_rank', 
      label: '수익성 순위',
      format: (value) => {
        const rankColors = {
          1: 'text-green-600 bg-green-50',
          2: 'text-blue-600 bg-blue-50',
          3: 'text-purple-600 bg-purple-50'
        };
        const color = rankColors[value] || 'text-gray-600 bg-gray-50';
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
            {value}위
          </span>
        );
      },
      sortable: true
    }
  ];

  const categoryColumns = [
    { key: 'category', label: '카테고리', sortable: true },
    { key: 'product_count', label: '제품수', format: 'number', sortable: true },
    { key: 'total_revenue', label: '총매출', format: 'currency', sortable: true },
    { key: 'total_cost', label: '총원가', format: 'currency', sortable: true },
    { key: 'total_profit', label: '총이익', format: 'currency', sortable: true },
    { key: 'avg_margin', label: '평균이익률', format: 'percentage', sortable: true },
    { key: 'revenue_share', label: '매출비중', format: 'percentage', sortable: true }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">제품별 수익성 분석</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="평균 제품 이익률"
          value={summary.avg_product_margin}
          format="percentage"
          icon={PieChart}
          iconColor="blue"
        />
        <KPICard
          title="최고 수익 제품"
          value={summary.top_profit_product}
          format="text"
          icon={TrendingUp}
          iconColor="green"
        />
        <KPICard
          title="총 제품 수익"
          value={summary.total_product_profit}
          format="currency"
          icon={DollarSign}
          iconColor="purple"
        />
        <KPICard
          title="저수익 제품수"
          value={summary.low_margin_products}
          format="number"
          suffix="개"
          icon={Package}
          iconColor="red"
        />
      </div>

      {/* Profitability Trend Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">제품별 수익성 추이</h3>
        <TrendChart
          data={profitability_trend}
          type="line"
          dataKeys={[
            { dataKey: 'product_a', name: '제품 A' },
            { dataKey: 'product_b', name: '제품 B' },
            { dataKey: 'product_c', name: '제품 C' },
            { dataKey: 'product_d', name: '제품 D' },
            { dataKey: 'product_e', name: '제품 E' }
          ]}
          xDataKey="month"
          height={350}
        />
      </div>

      {/* Product Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">상위 10개 제품 수익성</h3>
          <TrendChart
            data={products.slice(0, 10)}
            type="bar"
            dataKeys={[
              { dataKey: 'gross_margin', name: '이익률 (%)' }
            ]}
            xDataKey="product_name"
            height={300}
            colors={['#3B82F6']}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">제품별 매출 vs 이익</h3>
          <TrendChart
            data={products.slice(0, 10)}
            type="bar"
            dataKeys={[
              { dataKey: 'revenue', name: '매출액', color: '#10B981' },
              { dataKey: 'gross_profit', name: '매출총이익', color: '#8B5CF6' }
            ]}
            xDataKey="product_name"
            height={300}
            formatYAxis="currency"
          />
        </div>
      </div>

      {/* Category Analysis */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">카테고리별 수익성 분석</h3>
        <DataTable
          columns={categoryColumns}
          data={category_analysis}
          pageSize={10}
        />
      </div>

      {/* Product Details Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">제품별 상세 수익성</h3>
        <DataTable
          columns={productColumns}
          data={products}
          pageSize={20}
        />
      </div>
    </div>
  );
}

export default ByProduct;