import { useState, useEffect } from 'react';
import { productionAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';
import { Settings, Activity, Clock, Wrench } from 'lucide-react';

function Equipment() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productionAPI.getEquipment(period);
      setData(response);
    } catch (err) {
      setError(err.message || '설비 가동률 데이터를 불러오는데 실패했습니다');
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

  const { summary, equipment, utilization_trend, maintenance_schedule } = data;

  const equipmentColumns = [
    { key: 'equipment_id', label: '설비 ID', sortable: true },
    { key: 'equipment_name', label: '설비명', sortable: true },
    { key: 'equipment_type', label: '설비 유형', sortable: true },
    { key: 'location', label: '위치', sortable: true },
    { 
      key: 'utilization_rate', 
      label: '가동률',
      format: (value) => {
        const color = value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600';
        return <span className={`font-medium ${color}`}>{value}%</span>;
      },
      sortable: true
    },
    { 
      key: 'oee', 
      label: 'OEE',
      format: (value) => {
        const color = value >= 85 ? 'text-green-600' : value >= 65 ? 'text-yellow-600' : 'text-red-600';
        return <span className={`font-medium ${color}`}>{value}%</span>;
      },
      sortable: true
    },
    { key: 'total_runtime', label: '총 가동시간', format: (value) => `${value}시간`, sortable: true },
    { key: 'downtime', label: '정지시간', format: (value) => `${value}시간`, sortable: true },
    { key: 'mtbf', label: 'MTBF', format: (value) => `${value}시간`, sortable: true },
    { key: 'mttr', label: 'MTTR', format: (value) => `${value}시간`, sortable: true },
    { 
      key: 'status', 
      label: '현재 상태',
      format: (value) => {
        const statusConfig = {
          '가동중': { color: 'text-green-600 bg-green-50', icon: '🟢' },
          '계획정지': { color: 'text-blue-600 bg-blue-50', icon: '🔵' },
          '고장': { color: 'text-red-600 bg-red-50', icon: '🔴' },
          '대기': { color: 'text-yellow-600 bg-yellow-50', icon: '🟡' }
        };
        const config = statusConfig[value] || statusConfig['대기'];
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {config.icon} {value}
          </span>
        );
      }
    }
  ];

  const maintenanceColumns = [
    { key: 'equipment_name', label: '설비명', sortable: true },
    { key: 'maintenance_type', label: '점검 유형', sortable: true },
    { key: 'scheduled_date', label: '예정일', format: 'date', sortable: true },
    { key: 'last_maintenance', label: '최근 점검일', format: 'date', sortable: true },
    { key: 'days_until_due', label: '잔여일수', format: (value) => {
      const color = value <= 7 ? 'text-red-600' : value <= 30 ? 'text-yellow-600' : 'text-green-600';
      return <span className={`font-medium ${color}`}>{value}일</span>;
    }, sortable: true },
    { 
      key: 'priority', 
      label: '우선순위',
      format: (value) => {
        const priorityColors = {
          '긴급': 'text-red-600 bg-red-50',
          '높음': 'text-orange-600 bg-orange-50',
          '보통': 'text-yellow-600 bg-yellow-50',
          '낮음': 'text-green-600 bg-green-50'
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[value] || ''}`}>
            {value}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">설비 가동률 현황</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="전체 가동률"
          value={summary.overall_utilization}
          format="percentage"
          icon={Activity}
          iconColor="blue"
        />
        <KPICard
          title="평균 OEE"
          value={summary.avg_oee}
          format="percentage"
          icon={Settings}
          iconColor="green"
        />
        <KPICard
          title="평균 MTBF"
          value={summary.avg_mtbf}
          format="number"
          suffix="시간"
          icon={Clock}
          iconColor="purple"
        />
        <KPICard
          title="계획정비 준수율"
          value={summary.maintenance_compliance}
          format="percentage"
          icon={Wrench}
          iconColor="amber"
        />
      </div>

      {/* Utilization Trend Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">설비 가동률 추이</h3>
        <TrendChart
          data={utilization_trend}
          type="line"
          dataKeys={[
            { dataKey: 'utilization', name: '가동률 (%)' },
            { dataKey: 'oee', name: 'OEE (%)' },
            { dataKey: 'target', name: '목표 가동률 (%)', dashStyle: [5, 5] }
          ]}
          xDataKey="date"
          height={300}
          colors={['#3B82F6', '#10B981', '#F59E0B']}
        />
      </div>

      {/* Equipment Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">설비별 가동률</h3>
          <TrendChart
            data={equipment.slice(0, 10)}
            type="bar"
            dataKeys={[
              { dataKey: 'utilization_rate', name: '가동률 (%)' }
            ]}
            xDataKey="equipment_name"
            height={300}
            colors={['#3B82F6']}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">가동/정지 시간 분석</h3>
          <TrendChart
            data={equipment.slice(0, 10)}
            type="bar"
            dataKeys={[
              { dataKey: 'total_runtime', name: '가동시간', color: '#10B981' },
              { dataKey: 'downtime', name: '정지시간', color: '#EF4444' }
            ]}
            xDataKey="equipment_name"
            height={300}
            stacked={true}
          />
        </div>
      </div>

      {/* Equipment Details Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">설비 상세 정보</h3>
        <DataTable
          columns={equipmentColumns}
          data={equipment}
          pageSize={15}
        />
      </div>

      {/* Maintenance Schedule */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">예방정비 일정</h3>
        <DataTable
          columns={maintenanceColumns}
          data={maintenance_schedule}
          pageSize={10}
        />
      </div>
    </div>
  );
}

export default Equipment;