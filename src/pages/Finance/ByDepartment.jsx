import { useState, useEffect } from 'react';
import { financeAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';
import { Building, TrendingUp, TrendingDown, Users } from 'lucide-react';

function ByDepartment() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeAPI.getByDepartment(period);
      setData(response);
    } catch (err) {
      setError(err.message || '부서별 재무 데이터를 불러오는데 실패했습니다');
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

  const { summary, departments, expense_trend, budget_comparison } = data;

  const departmentColumns = [
    { key: 'department_name', label: '부서명', sortable: true },
    { key: 'department_head', label: '부서장', sortable: true },
    { key: 'employee_count', label: '인원', format: 'number', sortable: true },
    { key: 'total_expense', label: '총 비용', format: 'currency', sortable: true },
    { key: 'salary_expense', label: '인건비', format: 'currency', sortable: true },
    { key: 'operating_expense', label: '운영비', format: 'currency', sortable: true },
    { key: 'cost_per_employee', label: '인당 비용', format: 'currency', sortable: true },
    { key: 'budget', label: '예산', format: 'currency', sortable: true },
    { 
      key: 'budget_utilization', 
      label: '예산 소진율',
      format: (value) => {
        const color = value > 100 ? 'text-red-600' : value > 80 ? 'text-yellow-600' : 'text-green-600';
        return <span className={`font-medium ${color}`}>{value}%</span>;
      },
      sortable: true
    },
    { 
      key: 'variance', 
      label: '예산 차이',
      format: (value) => {
        const color = value < 0 ? 'text-red-600' : 'text-green-600';
        const prefix = value > 0 ? '+' : '';
        return <span className={`font-medium ${color}`}>{prefix}{value.toLocaleString()}원</span>;
      },
      sortable: true
    }
  ];

  const budgetColumns = [
    { key: 'department_name', label: '부서명', sortable: true },
    { key: 'category', label: '비용 항목', sortable: true },
    { key: 'budget', label: '예산', format: 'currency', sortable: true },
    { key: 'actual', label: '실제', format: 'currency', sortable: true },
    { key: 'variance', label: '차이', format: 'currency', sortable: true },
    { 
      key: 'variance_percentage', 
      label: '차이율',
      format: (value) => {
        const color = value < 0 ? 'text-red-600' : 'text-green-600';
        return <span className={`font-medium ${color}`}>{value.toFixed(1)}%</span>;
      },
      sortable: true
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">부서별 손익 분석</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="총 운영비용"
          value={summary.total_operating_expense}
          format="currency"
          icon={Building}
          iconColor="blue"
        />
        <KPICard
          title="평균 예산 소진율"
          value={summary.avg_budget_utilization}
          format="percentage"
          icon={TrendingUp}
          iconColor="green"
        />
        <KPICard
          title="예산 초과 부서"
          value={summary.over_budget_departments}
          format="number"
          suffix="개"
          icon={TrendingDown}
          iconColor="red"
        />
        <KPICard
          title="총 인원수"
          value={summary.total_employees}
          format="number"
          suffix="명"
          icon={Users}
          iconColor="purple"
        />
      </div>

      {/* Department Expense Trend */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">부서별 비용 추이</h3>
        <TrendChart
          data={expense_trend}
          type="line"
          dataKeys={[
            { dataKey: 'sales_dept', name: '영업부' },
            { dataKey: 'production_dept', name: '생산부' },
            { dataKey: 'rd_dept', name: '연구개발부' },
            { dataKey: 'admin_dept', name: '관리부' },
            { dataKey: 'quality_dept', name: '품질관리부' }
          ]}
          xDataKey="month"
          height={350}
          formatYAxis="currency"
        />
      </div>

      {/* Department Cost Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">부서별 비용 구성</h3>
          <TrendChart
            data={departments}
            type="bar"
            dataKeys={[
              { dataKey: 'salary_expense', name: '인건비', color: '#3B82F6' },
              { dataKey: 'operating_expense', name: '운영비', color: '#10B981' }
            ]}
            xDataKey="department_name"
            height={300}
            stacked={true}
            formatYAxis="currency"
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">예산 대비 실적</h3>
          <TrendChart
            data={departments}
            type="bar"
            dataKeys={[
              { dataKey: 'budget', name: '예산', color: '#E5E7EB' },
              { dataKey: 'total_expense', name: '실제 비용', color: '#3B82F6' }
            ]}
            xDataKey="department_name"
            height={300}
            formatYAxis="currency"
          />
        </div>
      </div>

      {/* Department Details Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">부서별 상세 정보</h3>
        <DataTable
          columns={departmentColumns}
          data={departments}
          pageSize={15}
        />
      </div>

      {/* Budget Variance Analysis */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">예산 차이 분석</h3>
        <DataTable
          columns={budgetColumns}
          data={budget_comparison}
          pageSize={20}
        />
      </div>
    </div>
  );
}

export default ByDepartment;