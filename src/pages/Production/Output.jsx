import { useState, useEffect } from 'react';
import { productionAPI } from '../../services/api';
import KPICard from '../../components/KPICard';
import TrendChart from '../../components/TrendChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';
import { Factory, TrendingUp, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';

function Output() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productionAPI.getOutput(period);
      setData(response);
    } catch (err) {
      setError(err.message || '생산 현황 데이터를 불러오는데 실패했습니다');
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
        <h2 className="text-2xl font-bold text-gray-900">월별 생산량</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <KPICard
          title="총 생산량"
          value={kpis.total_output.value}
          format="number"
          suffix="개"
          icon={Factory}
          iconColor="blue"
        />
        <KPICard
          title="생산 목표 달성률"
          value={kpis.target_achievement.value}
          format="percentage"
          icon={TrendingUp}
          iconColor="green"
        />
        <KPICard
          title="평균 생산 효율"
          value={kpis.production_efficiency.value}
          format="percentage"
          icon={Zap}
          iconColor="purple"
        />
        <KPICard
          title="불량률"
          value={kpis.defect_rate.value}
          format="percentage"
          icon={AlertTriangle}
          iconColor="red"
        />
        <KPICard
          title="완료 작업 지시"
          value={kpis.completed_orders.value}
          format="number"
          suffix="건"
          icon={CheckCircle}
          iconColor="green"
        />
        <KPICard
          title="평균 생산 시간"
          value={kpis.avg_production_time.value}
          format="decimal"
          suffix="시간"
          icon={Clock}
          iconColor="amber"
        />
      </div>

      {/* Production Output Trend */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">월별 생산량 추이</h3>
        <TrendChart
          data={trend}
          type="bar"
          dataKeys={[
            { dataKey: 'planned', name: '계획', color: '#3B82F6' },
            { dataKey: 'actual', name: '실적', color: '#10B981' }
          ]}
          xDataKey="month"
          height={350}
          stacked={false}
        />
      </div>

      {/* Production Efficiency Trend */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">생산 효율성 추이</h3>
        <TrendChart
          data={trend}
          type="line"
          dataKeys={[
            { dataKey: 'efficiency', name: '생산 효율 (%)' },
            { dataKey: 'defect_rate', name: '불량률 (%)' }
          ]}
          xDataKey="month"
          height={350}
          colors={['#8B5CF6', '#EF4444']}
        />
      </div>
    </div>
  );
}

export default Output;