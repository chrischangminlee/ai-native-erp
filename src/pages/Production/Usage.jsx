import { useState, useEffect } from 'react';
import { productionAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';
import { Package, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';

function Usage() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productionAPI.getUsage(period);
      setData(response);
    } catch (err) {
      setError(err.message || '자재 사용 데이터를 불러오는데 실패했습니다');
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

  const { summary, materials, usage_trend, variance_analysis } = data;

  const materialColumns = [
    { key: 'material_code', label: '자재코드', sortable: true },
    { key: 'material_name', label: '자재명', sortable: true },
    { key: 'category', label: '분류', sortable: true },
    { key: 'unit', label: '단위' },
    { key: 'standard_usage', label: '표준 사용량', format: 'number', sortable: true },
    { key: 'actual_usage', label: '실제 사용량', format: 'number', sortable: true },
    { 
      key: 'variance', 
      label: '차이', 
      format: (value) => {
        const color = value > 0 ? 'text-red-600' : value < 0 ? 'text-green-600' : 'text-gray-600';
        const prefix = value > 0 ? '+' : '';
        return <span className={`font-medium ${color}`}>{prefix}{value.toLocaleString()}</span>;
      },
      sortable: true 
    },
    { 
      key: 'variance_rate', 
      label: '차이율', 
      format: (value) => {
        const color = Math.abs(value) > 5 ? 'text-red-600' : 'text-green-600';
        return <span className={`font-medium ${color}`}>{value.toFixed(1)}%</span>;
      },
      sortable: true 
    },
    { key: 'unit_cost', label: '단가', format: 'currency', sortable: true },
    { key: 'total_cost', label: '총 비용', format: 'currency', sortable: true },
    { key: 'cost_variance', label: '비용 차이', format: 'currency', sortable: true }
  ];

  const varianceColumns = [
    { key: 'product', label: '제품', sortable: true },
    { key: 'production_qty', label: '생산량', format: 'number', sortable: true },
    { key: 'material_name', label: '주요 자재', sortable: true },
    { key: 'standard_cost', label: '표준 원가', format: 'currency', sortable: true },
    { key: 'actual_cost', label: '실제 원가', format: 'currency', sortable: true },
    { key: 'variance', label: '차이', format: 'currency', sortable: true },
    { 
      key: 'variance_type', 
      label: '차이 유형',
      format: (value) => {
        const types = {
          '수량차이': 'text-blue-600 bg-blue-50',
          '가격차이': 'text-purple-600 bg-purple-50',
          '혼합차이': 'text-orange-600 bg-orange-50'
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${types[value] || ''}`}>
            {value}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">자재 사용 현황</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="총 자재 비용"
          value={summary.total_material_cost}
          format="currency"
          icon={DollarSign}
          iconColor="blue"
        />
        <KPICard
          title="자재 효율성"
          value={summary.material_efficiency}
          format="percentage"
          icon={TrendingUp}
          iconColor="green"
        />
        <KPICard
          title="비용 절감액"
          value={summary.cost_savings}
          format="currency"
          icon={Package}
          iconColor="purple"
        />
        <KPICard
          title="초과 사용 품목"
          value={summary.over_usage_items}
          format="number"
          suffix="개"
          icon={AlertCircle}
          iconColor="red"
        />
      </div>

      {/* Usage Trend Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">자재 사용량 추이</h3>
        <TrendChart
          data={usage_trend}
          type="bar"
          dataKeys={[
            { dataKey: 'standard', name: '표준 사용량', color: '#3B82F6' },
            { dataKey: 'actual', name: '실제 사용량', color: '#10B981' }
          ]}
          xDataKey="date"
          height={300}
        />
      </div>

      {/* Cost Analysis Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">자재별 비용 구성</h3>
          <TrendChart
            data={materials.slice(0, 10)}
            type="bar"
            dataKeys={[
              { dataKey: 'total_cost', name: '총 비용' }
            ]}
            xDataKey="material_name"
            height={300}
            colors={['#8B5CF6']}
            formatYAxis="currency"
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">사용량 대비 효율성</h3>
          <TrendChart
            data={materials.slice(0, 10)}
            type="bar"
            dataKeys={[
              { dataKey: 'variance_rate', name: '차이율 (%)' }
            ]}
            xDataKey="material_name"
            height={300}
            colors={['#F59E0B']}
          />
        </div>
      </div>

      {/* Variance Analysis Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">원가 차이 분석</h3>
        <DataTable
          columns={varianceColumns}
          data={variance_analysis}
          pageSize={10}
        />
      </div>

      {/* Material Usage Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">자재 사용 상세</h3>
        <DataTable
          columns={materialColumns}
          data={materials}
          pageSize={20}
        />
      </div>
    </div>
  );
}

export default Usage;