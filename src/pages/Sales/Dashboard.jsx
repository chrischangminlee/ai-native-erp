import { useState, useEffect } from 'react';
import { salesAPI } from '../../services/api';
import KPICard from '../../components/KPICard';
import TrendChart from '../../components/TrendChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';

function Dashboard() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesAPI.getDashboard(period);
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to fetch sales dashboard data');
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

  const { kpis, trend } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">매출 대시보드</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <KPICard
          title="매출액"
          value={kpis.revenue.value}
          format="currency"
          trend={parseFloat(kpis.revenue.yoy) > 0 ? 1 : parseFloat(kpis.revenue.yoy) < 0 ? -1 : 0}
          trendValue={Math.abs(parseFloat(kpis.revenue.yoy))}
        />
        <KPICard
          title="판매 수량"
          value={kpis.units_sold.value}
          format="number"
          trend={parseFloat(kpis.units_sold.yoy) > 0 ? 1 : parseFloat(kpis.units_sold.yoy) < 0 ? -1 : 0}
          trendValue={Math.abs(parseFloat(kpis.units_sold.yoy))}
        />
        <KPICard
          title="평균 단가"
          value={kpis.avg_unit_price.value}
          format="currency"
        />
        <KPICard
          title="신규 고객 매출 비율"
          value={kpis.new_customer_ratio.value}
          format="percentage"
        />
        <KPICard
          title="매출 총이익률"
          value={kpis.gross_margin.value}
          format="percentage"
        />
        <KPICard
          title="총 주문 수"
          value={kpis.order_count.value}
          format="number"
        />
      </div>

      {/* Revenue Trend Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">매출 추이</h3>
        <TrendChart
          data={trend}
          type="line"
          dataKeys={[
            { dataKey: 'revenue', name: '매출액' }
          ]}
          xDataKey="month"
          formatYAxis="currency"
          height={350}
        />
      </div>

      {/* Orders Trend Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">주문량 추이</h3>
        <TrendChart
          data={trend}
          type="bar"
          dataKeys={[
            { dataKey: 'orders', name: '주문 수' }
          ]}
          xDataKey="month"
          height={350}
          colors={['#10B981']}
        />
      </div>
    </div>
  );
}

export default Dashboard;