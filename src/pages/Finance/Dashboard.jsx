import { useState, useEffect } from 'react';
import { financeAPI } from '../../services/api';
import KPICard from '../../components/KPICard';
import TrendChart from '../../components/TrendChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';
import { DollarSign, TrendingUp, TrendingDown, PieChart, AlertCircle, Calculator } from 'lucide-react';

function Dashboard() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeAPI.getDashboard(period);
      setData(response);
    } catch (err) {
      setError(err.message || '재무 대시보드 데이터를 불러오는데 실패했습니다');
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

  const { kpis, trend, cost_structure } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">월별 손익 분석</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <KPICard
          title="매출액"
          value={kpis.revenue.value}
          format="currency"
          icon={DollarSign}
          iconColor="blue"
        />
        <KPICard
          title="매출총이익"
          value={kpis.gross_profit.value}
          format="currency"
          icon={TrendingUp}
          iconColor="green"
        />
        <KPICard
          title="영업이익"
          value={kpis.operating_profit.value}
          format="currency"
          icon={Calculator}
          iconColor="purple"
        />
        <KPICard
          title="순이익"
          value={kpis.net_profit.value}
          format="currency"
          icon={TrendingUp}
          iconColor="emerald"
        />
        <KPICard
          title="매출총이익률"
          value={kpis.gross_margin.value}
          format="percentage"
          icon={PieChart}
          iconColor="blue"
        />
        <KPICard
          title="영업이익률"
          value={kpis.operating_margin.value}
          format="percentage"
          icon={PieChart}
          iconColor="purple"
        />
        <KPICard
          title="순이익률"
          value={kpis.net_margin.value}
          format="percentage"
          icon={PieChart}
          iconColor="emerald"
        />
        <KPICard
          title="원가율"
          value={kpis.cost_ratio.value}
          format="percentage"
          icon={AlertCircle}
          iconColor="amber"
        />
      </div>

      {/* P&L Trend Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">손익 추이</h3>
        <TrendChart
          data={trend}
          type="bar"
          dataKeys={[
            { dataKey: 'revenue', name: '매출액', color: '#3B82F6' },
            { dataKey: 'cost', name: '매출원가', color: '#EF4444' },
            { dataKey: 'gross_profit', name: '매출총이익', color: '#10B981' },
            { dataKey: 'operating_expenses', name: '운영비', color: '#F59E0B' },
            { dataKey: 'net_profit', name: '순이익', color: '#8B5CF6' }
          ]}
          xDataKey="month"
          height={350}
          stacked={false}
          formatYAxis="currency"
        />
      </div>

      {/* Margin Trend Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">이익률 추이</h3>
        <TrendChart
          data={trend}
          type="line"
          dataKeys={[
            { dataKey: 'gross_margin', name: '매출총이익률 (%)' },
            { dataKey: 'operating_margin', name: '영업이익률 (%)' },
            { dataKey: 'net_margin', name: '순이익률 (%)' }
          ]}
          xDataKey="month"
          height={350}
          colors={['#3B82F6', '#8B5CF6', '#10B981']}
        />
      </div>

      {/* Cost Structure */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">비용 구조</h3>
        <TrendChart
          data={cost_structure}
          type="bar"
          dataKeys={[
            { dataKey: 'material_cost', name: '재료비', color: '#3B82F6' },
            { dataKey: 'labor_cost', name: '인건비', color: '#10B981' },
            { dataKey: 'overhead_cost', name: '제조경비', color: '#F59E0B' },
            { dataKey: 'admin_cost', name: '관리비', color: '#8B5CF6' },
            { dataKey: 'sales_cost', name: '판매비', color: '#EF4444' }
          ]}
          xDataKey="month"
          height={350}
          stacked={true}
          formatYAxis="currency"
        />
      </div>
    </div>
  );
}

export default Dashboard;