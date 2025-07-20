import { useState, useEffect } from 'react';
import { productionAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';
import { AlertTriangle, TrendingDown, XCircle, Target } from 'lucide-react';

function Defects() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productionAPI.getDefects(period);
      setData(response);
    } catch (err) {
      setError(err.message || '불량 및 스크랩 데이터를 불러오는데 실패했습니다');
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

  const { summary, defects, defect_by_type, defect_trend, pareto_analysis } = data;

  const defectColumns = [
    { key: 'defect_date', label: '발생일', format: 'date', sortable: true },
    { key: 'work_order', label: '작업지시번호', sortable: true },
    { key: 'product_name', label: '제품명', sortable: true },
    { key: 'process', label: '공정', sortable: true },
    { key: 'defect_type', label: '불량 유형', sortable: true },
    { key: 'defect_qty', label: '불량 수량', format: 'number', sortable: true },
    { key: 'scrap_qty', label: '스크랩 수량', format: 'number', sortable: true },
    { key: 'rework_qty', label: '재작업 수량', format: 'number', sortable: true },
    { key: 'defect_cost', label: '불량 비용', format: 'currency', sortable: true },
    { key: 'root_cause', label: '원인' },
    { 
      key: 'severity', 
      label: '심각도',
      format: (value) => {
        const severityConfig = {
          '심각': { color: 'text-red-600 bg-red-50', icon: '🔴' },
          '높음': { color: 'text-orange-600 bg-orange-50', icon: '🟠' },
          '보통': { color: 'text-yellow-600 bg-yellow-50', icon: '🟡' },
          '낮음': { color: 'text-green-600 bg-green-50', icon: '🟢' }
        };
        const config = severityConfig[value] || severityConfig['보통'];
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {config.icon} {value}
          </span>
        );
      }
    },
    { 
      key: 'status', 
      label: '처리상태',
      format: (value) => {
        const statusColors = {
          '미처리': 'text-gray-600 bg-gray-50',
          '처리중': 'text-blue-600 bg-blue-50',
          '완료': 'text-green-600 bg-green-50'
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[value] || ''}`}>
            {value}
          </span>
        );
      }
    }
  ];

  const paretoColumns = [
    { key: 'defect_type', label: '불량 유형', sortable: true },
    { key: 'frequency', label: '발생 건수', format: 'number', sortable: true },
    { key: 'percentage', label: '비율', format: 'percentage', sortable: true },
    { key: 'cumulative_percentage', label: '누적 비율', format: 'percentage', sortable: true },
    { key: 'total_cost', label: '총 비용', format: 'currency', sortable: true }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">불량 및 스크랩 관리</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="불량률"
          value={summary.defect_rate}
          format="percentage"
          icon={AlertTriangle}
          iconColor="red"
        />
        <KPICard
          title="스크랩률"
          value={summary.scrap_rate}
          format="percentage"
          icon={XCircle}
          iconColor="orange"
        />
        <KPICard
          title="품질 목표 달성률"
          value={summary.quality_achievement}
          format="percentage"
          icon={Target}
          iconColor="green"
        />
        <KPICard
          title="불량 비용"
          value={summary.total_defect_cost}
          format="currency"
          icon={TrendingDown}
          iconColor="purple"
        />
      </div>

      {/* Defect Trend Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">불량률 추이</h3>
        <TrendChart
          data={defect_trend}
          type="line"
          dataKeys={[
            { dataKey: 'defect_rate', name: '불량률 (%)' },
            { dataKey: 'scrap_rate', name: '스크랩률 (%)' },
            { dataKey: 'target_rate', name: '목표 불량률 (%)', dashStyle: [5, 5] }
          ]}
          xDataKey="date"
          height={300}
          colors={['#EF4444', '#F59E0B', '#10B981']}
        />
      </div>

      {/* Defect Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">불량 유형별 분포</h3>
          <TrendChart
            data={defect_by_type}
            type="bar"
            dataKeys={[
              { dataKey: 'count', name: '발생 건수' }
            ]}
            xDataKey="type"
            height={300}
            colors={['#3B82F6']}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">공정별 불량 발생</h3>
          <TrendChart
            data={defect_by_type}
            type="bar"
            dataKeys={[
              { dataKey: 'defect_qty', name: '불량 수량', color: '#EF4444' },
              { dataKey: 'scrap_qty', name: '스크랩 수량', color: '#F59E0B' }
            ]}
            xDataKey="process"
            height={300}
            stacked={true}
          />
        </div>
      </div>

      {/* Pareto Analysis */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">파레토 분석 (80/20 법칙)</h3>
        <DataTable
          columns={paretoColumns}
          data={pareto_analysis}
          pageSize={10}
        />
      </div>

      {/* Defect Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">불량 상세 내역</h3>
        <DataTable
          columns={defectColumns}
          data={defects}
          pageSize={20}
        />
      </div>
    </div>
  );
}

export default Defects;