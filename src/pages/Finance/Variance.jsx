import { useState, useEffect } from 'react';
import { financeAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';
import { GitBranch, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';

function Variance() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeAPI.getVariance(period);
      setData(response);
    } catch (err) {
      setError(err.message || '원가 차이 분석 데이터를 불러오는데 실패했습니다');
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

  const { summary, variances, variance_trend, department_variances } = data;

  const varianceColumns = [
    { key: 'variance_type', label: '차이 유형', sortable: true },
    { key: 'category', label: '분류', sortable: true },
    { key: 'item', label: '항목', sortable: true },
    { key: 'standard', label: '표준', format: 'currency', sortable: true },
    { key: 'actual', label: '실제', format: 'currency', sortable: true },
    { 
      key: 'variance_amount', 
      label: '차이금액',
      format: (value) => {
        const color = value < 0 ? 'text-red-600' : 'text-green-600';
        const prefix = value > 0 ? '+' : '';
        return <span className={`font-medium ${color}`}>{prefix}{value.toLocaleString()}원</span>;
      },
      sortable: true
    },
    { 
      key: 'variance_rate', 
      label: '차이율',
      format: (value) => {
        const color = Math.abs(value) > 5 ? 'text-red-600' : 'text-green-600';
        const prefix = value > 0 ? '+' : '';
        return <span className={`font-medium ${color}`}>{prefix}{value.toFixed(1)}%</span>;
      },
      sortable: true
    },
    { key: 'responsible_dept', label: '책임부서', sortable: true },
    { key: 'root_cause', label: '발생원인' },
    { 
      key: 'action_required', 
      label: '조치필요',
      format: (value) => {
        const actionColors = {
          '긴급': 'text-red-600 bg-red-50',
          '필요': 'text-yellow-600 bg-yellow-50',
          '관찰': 'text-blue-600 bg-blue-50',
          '없음': 'text-green-600 bg-green-50'
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[value] || ''}`}>
            {value}
          </span>
        );
      }
    }
  ];

  const departmentColumns = [
    { key: 'department', label: '부서', sortable: true },
    { key: 'material_variance', label: '재료비 차이', format: 'currency', sortable: true },
    { key: 'labor_variance', label: '노무비 차이', format: 'currency', sortable: true },
    { key: 'overhead_variance', label: '제조경비 차이', format: 'currency', sortable: true },
    { key: 'total_variance', label: '총 차이', format: 'currency', sortable: true },
    { 
      key: 'variance_percentage', 
      label: '차이율',
      format: (value) => {
        const color = Math.abs(value) > 5 ? 'text-red-600' : 'text-green-600';
        return <span className={`font-medium ${color}`}>{value.toFixed(1)}%</span>;
      },
      sortable: true
    },
    { key: 'action_items', label: '개선 항목수', format: 'number', sortable: true }
  ];

  const getVarianceCategory = (amount) => {
    if (amount < 0) return { label: '불리한 차이', color: 'text-red-600' };
    return { label: '유리한 차이', color: 'text-green-600' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">원가 차이 분석</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="총 원가 차이"
          value={summary.total_variance}
          format="currency"
          icon={GitBranch}
          iconColor={summary.total_variance < 0 ? "red" : "green"}
        />
        <KPICard
          title="유리한 차이"
          value={summary.favorable_variance}
          format="currency"
          icon={CheckCircle}
          iconColor="green"
        />
        <KPICard
          title="불리한 차이"
          value={Math.abs(summary.unfavorable_variance)}
          format="currency"
          icon={AlertTriangle}
          iconColor="red"
        />
        <KPICard
          title="차이율"
          value={summary.variance_rate}
          format="percentage"
          icon={TrendingDown}
          iconColor="purple"
        />
      </div>

      {/* Variance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-lg font-medium text-gray-900 mb-3">재료비 차이</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">가격 차이</span>
              <span className={`font-medium ${summary.material_price_variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary.material_price_variance.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">수량 차이</span>
              <span className={`font-medium ${summary.material_quantity_variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary.material_quantity_variance.toLocaleString()}원
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>소계</span>
              <span className={summary.material_total_variance < 0 ? 'text-red-600' : 'text-green-600'}>
                {summary.material_total_variance.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-lg font-medium text-gray-900 mb-3">노무비 차이</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">임률 차이</span>
              <span className={`font-medium ${summary.labor_rate_variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary.labor_rate_variance.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">효율 차이</span>
              <span className={`font-medium ${summary.labor_efficiency_variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary.labor_efficiency_variance.toLocaleString()}원
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>소계</span>
              <span className={summary.labor_total_variance < 0 ? 'text-red-600' : 'text-green-600'}>
                {summary.labor_total_variance.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-lg font-medium text-gray-900 mb-3">제조경비 차이</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">예산 차이</span>
              <span className={`font-medium ${summary.overhead_budget_variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary.overhead_budget_variance.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">조업도 차이</span>
              <span className={`font-medium ${summary.overhead_volume_variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary.overhead_volume_variance.toLocaleString()}원
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>소계</span>
              <span className={summary.overhead_total_variance < 0 ? 'text-red-600' : 'text-green-600'}>
                {summary.overhead_total_variance.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Variance Trend Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">월별 원가 차이 추이</h3>
        <TrendChart
          data={variance_trend}
          type="bar"
          dataKeys={[
            { dataKey: 'material_variance', name: '재료비 차이', color: '#3B82F6' },
            { dataKey: 'labor_variance', name: '노무비 차이', color: '#10B981' },
            { dataKey: 'overhead_variance', name: '제조경비 차이', color: '#8B5CF6' }
          ]}
          xDataKey="month"
          height={350}
          formatYAxis="currency"
        />
      </div>

      {/* Department Variance Analysis */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">부서별 차이 분석</h3>
        <DataTable
          columns={departmentColumns}
          data={department_variances}
          pageSize={10}
        />
      </div>

      {/* Detailed Variance Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">상세 차이 내역</h3>
        <DataTable
          columns={varianceColumns}
          data={variances}
          pageSize={20}
        />
      </div>
    </div>
  );
}

export default Variance;