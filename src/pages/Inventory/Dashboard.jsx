import { useState, useEffect } from 'react';
import { inventoryAPI } from '../../services/api';
import KPICard from '../../components/KPICard';
import TrendChart from '../../components/TrendChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';
import { Package, AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react';

function Dashboard() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryAPI.getDashboard(period);
      setData(response);
    } catch (err) {
      setError(err.message || '재고 대시보드 데이터를 불러오는데 실패했습니다');
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
        <h2 className="text-2xl font-bold text-gray-900">재고 대시보드</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <KPICard
          title="총 재고 가치"
          value={kpis.total_value.value}
          format="currency"
          icon={Package}
          iconColor="blue"
        />
        <KPICard
          title="총 재고 수량"
          value={kpis.total_quantity.value}
          format="number"
          icon={Package}
          iconColor="green"
        />
        <KPICard
          title="재고 회전율"
          value={kpis.turnover_rate.value}
          format="decimal"
          suffix="회"
          icon={TrendingDown}
          iconColor="purple"
        />
        <KPICard
          title="재고 보유 일수"
          value={kpis.days_on_hand.value}
          format="number"
          suffix="일"
          icon={CheckCircle}
          iconColor="amber"
        />
        <KPICard
          title="안전재고 미달 품목"
          value={kpis.below_safety_stock.value}
          format="number"
          suffix="개"
          icon={AlertTriangle}
          iconColor="red"
        />
        <KPICard
          title="재고 정확도"
          value={kpis.stock_accuracy.value}
          format="percentage"
          icon={CheckCircle}
          iconColor="green"
        />
      </div>

      {/* Inventory Movement Trend */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">월별 재고 이동 추이</h3>
        <TrendChart
          data={trend}
          type="bar"
          dataKeys={[
            { dataKey: 'inbound', name: '입고', color: '#3B82F6' },
            { dataKey: 'outbound', name: '출고', color: '#EF4444' },
            { dataKey: 'transfers', name: '이동', color: '#F59E0B' }
          ]}
          xDataKey="month"
          height={350}
          stacked={false}
        />
      </div>

      {/* Inventory Balance Trend */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">재고 수준 추이</h3>
        <TrendChart
          data={trend.map(item => ({
            ...item,
            balance: item.inbound - item.outbound
          }))}
          type="line"
          dataKeys={[
            { dataKey: 'balance', name: '순 재고 변동' }
          ]}
          xDataKey="month"
          height={350}
          colors={['#8B5CF6']}
        />
      </div>
    </div>
  );
}

export default Dashboard;