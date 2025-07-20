import { useState, useEffect } from 'react';
import { productionAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';
import { Cpu, Zap, Clock, CheckCircle } from 'lucide-react';

function ByProcess() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productionAPI.getByProcess(period);
      setData(response);
    } catch (err) {
      setError(err.message || '공정별 데이터를 불러오는데 실패했습니다');
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

  const { summary, processes, efficiency_trend } = data;

  const processColumns = [
    { key: 'process_name', label: '공정명', sortable: true },
    { key: 'process_type', label: '공정 유형', sortable: true },
    { key: 'total_orders', label: '작업 지시', format: 'number', sortable: true },
    { key: 'completed_orders', label: '완료 건수', format: 'number', sortable: true },
    { key: 'output_quantity', label: '생산량', format: 'number', sortable: true },
    { key: 'defect_quantity', label: '불량수량', format: 'number', sortable: true },
    { 
      key: 'efficiency', 
      label: '효율성', 
      format: (value) => {
        const color = value >= 90 ? 'text-green-600' : value >= 70 ? 'text-yellow-600' : 'text-red-600';
        return <span className={`font-medium ${color}`}>{value}%</span>;
      },
      sortable: true 
    },
    { 
      key: 'yield_rate', 
      label: '수율', 
      format: (value) => {
        const color = value >= 95 ? 'text-green-600' : value >= 90 ? 'text-yellow-600' : 'text-red-600';
        return <span className={`font-medium ${color}`}>{value}%</span>;
      },
      sortable: true 
    },
    { key: 'avg_cycle_time', label: '평균 사이클타임', format: (value) => `${value}분`, sortable: true },
    { 
      key: 'status', 
      label: '상태',
      format: (value) => {
        const statusConfig = {
          '가동중': { color: 'text-green-600 bg-green-50', label: '가동중' },
          '대기': { color: 'text-yellow-600 bg-yellow-50', label: '대기' },
          '정지': { color: 'text-red-600 bg-red-50', label: '정지' },
          '점검중': { color: 'text-blue-600 bg-blue-50', label: '점검중' }
        };
        const config = statusConfig[value] || statusConfig['대기'];
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">공정별 생산 현황</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="전체 공정 효율"
          value={summary.overall_efficiency}
          format="percentage"
          icon={Zap}
          iconColor="blue"
        />
        <KPICard
          title="평균 수율"
          value={summary.avg_yield_rate}
          format="percentage"
          icon={CheckCircle}
          iconColor="green"
        />
        <KPICard
          title="평균 사이클타임"
          value={summary.avg_cycle_time}
          format="number"
          suffix="분"
          icon={Clock}
          iconColor="purple"
        />
        <KPICard
          title="병목 공정"
          value={summary.bottleneck_process}
          format="text"
          icon={Cpu}
          iconColor="red"
        />
      </div>

      {/* Efficiency Trend Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">공정별 효율성 추이</h3>
        <TrendChart
          data={efficiency_trend}
          type="line"
          dataKeys={[
            { dataKey: 'cutting', name: '절단 공정' },
            { dataKey: 'welding', name: '용접 공정' },
            { dataKey: 'assembly', name: '조립 공정' },
            { dataKey: 'painting', name: '도장 공정' },
            { dataKey: 'inspection', name: '검사 공정' }
          ]}
          xDataKey="date"
          height={350}
        />
      </div>

      {/* Process Performance Comparison */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">공정별 성과 비교</h3>
        <TrendChart
          data={processes}
          type="bar"
          dataKeys={[
            { dataKey: 'efficiency', name: '효율성 (%)', color: '#3B82F6' },
            { dataKey: 'yield_rate', name: '수율 (%)', color: '#10B981' }
          ]}
          xDataKey="process_name"
          height={300}
        />
      </div>

      {/* Process Details Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">공정 상세 정보</h3>
        <DataTable
          columns={processColumns}
          data={processes}
          pageSize={15}
        />
      </div>
    </div>
  );
}

export default ByProcess;