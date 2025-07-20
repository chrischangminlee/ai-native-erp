import { useState, useEffect } from 'react';
import { financeAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';
import { PieChart, TrendingUp, Layers, Calculator } from 'lucide-react';

function CostStructure() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeAPI.getCostStructure(period);
      setData(response);
    } catch (err) {
      setError(err.message || '비용 구조 데이터를 불러오는데 실패했습니다');
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

  const { summary, cost_breakdown, trend_analysis, department_costs } = data;

  const costBreakdownColumns = [
    { key: 'cost_category', label: '비용 항목', sortable: true },
    { key: 'cost_type', label: '비용 유형', format: (value) => {
      const typeColors = {
        '고정비': 'text-blue-600 bg-blue-50',
        '변동비': 'text-green-600 bg-green-50',
        '준변동비': 'text-purple-600 bg-purple-50'
      };
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[value] || ''}`}>
          {value}
        </span>
      );
    }},
    { key: 'amount', label: '금액', format: 'currency', sortable: true },
    { key: 'percentage', label: '구성비', format: 'percentage', sortable: true },
    { key: 'ytd_amount', label: '누계 금액', format: 'currency', sortable: true },
    { key: 'budget', label: '예산', format: 'currency', sortable: true },
    { 
      key: 'budget_variance', 
      label: '예산 차이',
      format: (value) => {
        const color = value > 0 ? 'text-red-600' : 'text-green-600';
        const prefix = value > 0 ? '+' : '';
        return <span className={`font-medium ${color}`}>{prefix}{value.toLocaleString()}원</span>;
      },
      sortable: true
    },
    { key: 'yoy_change', label: '전년대비', format: (value) => {
      const color = value > 0 ? 'text-red-600' : 'text-green-600';
      const prefix = value > 0 ? '+' : '';
      return <span className={`font-medium ${color}`}>{prefix}{value}%</span>;
    }, sortable: true }
  ];

  const departmentCostColumns = [
    { key: 'department', label: '부서', sortable: true },
    { key: 'fixed_cost', label: '고정비', format: 'currency', sortable: true },
    { key: 'variable_cost', label: '변동비', format: 'currency', sortable: true },
    { key: 'total_cost', label: '총비용', format: 'currency', sortable: true },
    { key: 'fixed_ratio', label: '고정비 비율', format: 'percentage', sortable: true },
    { key: 'cost_per_unit', label: '단위당 비용', format: 'currency', sortable: true }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">고정비 vs 변동비 분석</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="고정비 비율"
          value={summary.fixed_cost_ratio}
          format="percentage"
          icon={Layers}
          iconColor="blue"
        />
        <KPICard
          title="변동비 비율"
          value={summary.variable_cost_ratio}
          format="percentage"
          icon={TrendingUp}
          iconColor="green"
        />
        <KPICard
          title="손익분기점"
          value={summary.break_even_point}
          format="currency"
          icon={Calculator}
          iconColor="purple"
        />
        <KPICard
          title="안전마진율"
          value={summary.safety_margin}
          format="percentage"
          icon={PieChart}
          iconColor="amber"
        />
      </div>

      {/* Cost Structure Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">비용 구조 분포</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>고정비</span>
              </div>
              <span className="font-medium">{summary.fixed_cost_amount.toLocaleString()}원 ({summary.fixed_cost_ratio}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>변동비</span>
              </div>
              <span className="font-medium">{summary.variable_cost_amount.toLocaleString()}원 ({summary.variable_cost_ratio}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span>준변동비</span>
              </div>
              <span className="font-medium">{summary.semi_variable_cost_amount.toLocaleString()}원 ({summary.semi_variable_cost_ratio}%)</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CVP 분석</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">현재 매출액</span>
              <span className="font-medium">{summary.current_revenue.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">손익분기 매출</span>
              <span className="font-medium">{summary.break_even_revenue.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">공헌이익률</span>
              <span className="font-medium">{summary.contribution_margin_ratio}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">영업레버리지</span>
              <span className="font-medium">{summary.operating_leverage}배</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Trend Analysis */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">고정비/변동비 추이</h3>
        <TrendChart
          data={trend_analysis}
          type="bar"
          dataKeys={[
            { dataKey: 'fixed_cost', name: '고정비', color: '#3B82F6' },
            { dataKey: 'variable_cost', name: '변동비', color: '#10B981' },
            { dataKey: 'semi_variable_cost', name: '준변동비', color: '#8B5CF6' }
          ]}
          xDataKey="month"
          height={350}
          stacked={true}
          formatYAxis="currency"
        />
      </div>

      {/* Cost Ratio Trend */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">비용 비율 추이</h3>
        <TrendChart
          data={trend_analysis}
          type="line"
          dataKeys={[
            { dataKey: 'fixed_ratio', name: '고정비 비율 (%)' },
            { dataKey: 'variable_ratio', name: '변동비 비율 (%)' }
          ]}
          xDataKey="month"
          height={300}
          colors={['#3B82F6', '#10B981']}
        />
      </div>

      {/* Cost Breakdown Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">상세 비용 구조</h3>
        <DataTable
          columns={costBreakdownColumns}
          data={cost_breakdown}
          pageSize={20}
        />
      </div>

      {/* Department Cost Analysis */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">부서별 비용 구조</h3>
        <DataTable
          columns={departmentCostColumns}
          data={department_costs}
          pageSize={10}
        />
      </div>
    </div>
  );
}

export default CostStructure;