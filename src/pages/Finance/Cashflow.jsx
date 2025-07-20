import { useState, useEffect } from 'react';
import { financeAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';
import { Wallet, TrendingUp, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

function Cashflow() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeAPI.getCashflow(period);
      setData(response);
    } catch (err) {
      setError(err.message || '현금흐름 데이터를 불러오는데 실패했습니다');
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

  const { summary, cashflow_statement, daily_cashflow, financial_ratios } = data;

  const cashflowColumns = [
    { key: 'category', label: '구분', sortable: true },
    { key: 'item', label: '항목', sortable: true },
    { key: 'current_month', label: '당월', format: 'currency', sortable: true },
    { key: 'previous_month', label: '전월', format: 'currency', sortable: true },
    { key: 'ytd', label: '누계', format: 'currency', sortable: true },
    { 
      key: 'mom_change', 
      label: '전월대비',
      format: (value) => {
        const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600';
        const prefix = value > 0 ? '+' : '';
        return <span className={`font-medium ${color}`}>{prefix}{value.toLocaleString()}원</span>;
      },
      sortable: true
    },
    { 
      key: 'percentage_change', 
      label: '증감률',
      format: (value) => {
        const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600';
        const prefix = value > 0 ? '+' : '';
        return <span className={`font-medium ${color}`}>{prefix}{value.toFixed(1)}%</span>;
      },
      sortable: true
    }
  ];

  const ratioColumns = [
    { key: 'ratio_name', label: '재무비율', sortable: true },
    { key: 'current_value', label: '현재', format: (value, row) => {
      return row.is_percentage ? `${value}%` : value.toFixed(2);
    }, sortable: true },
    { key: 'previous_value', label: '전기', format: (value, row) => {
      return row.is_percentage ? `${value}%` : value.toFixed(2);
    }, sortable: true },
    { key: 'industry_avg', label: '업계평균', format: (value, row) => {
      return row.is_percentage ? `${value}%` : value.toFixed(2);
    }, sortable: true },
    { 
      key: 'assessment', 
      label: '평가',
      format: (value) => {
        const assessmentColors = {
          '우수': 'text-green-600 bg-green-50',
          '양호': 'text-blue-600 bg-blue-50',
          '보통': 'text-yellow-600 bg-yellow-50',
          '주의': 'text-orange-600 bg-orange-50',
          '위험': 'text-red-600 bg-red-50'
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${assessmentColors[value] || ''}`}>
            {value}
          </span>
        );
      }
    },
    { key: 'description', label: '설명' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">현금흐름 및 비율 분석</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="현금 잔액"
          value={summary.cash_balance}
          format="currency"
          icon={Wallet}
          iconColor="blue"
        />
        <KPICard
          title="영업현금흐름"
          value={summary.operating_cashflow}
          format="currency"
          icon={TrendingUp}
          iconColor={summary.operating_cashflow > 0 ? "green" : "red"}
        />
        <KPICard
          title="현금회전주기"
          value={summary.cash_conversion_cycle}
          format="number"
          suffix="일"
          icon={ArrowUpCircle}
          iconColor="purple"
        />
        <KPICard
          title="유동비율"
          value={summary.current_ratio}
          format="decimal"
          suffix="배"
          icon={ArrowDownCircle}
          iconColor="amber"
        />
      </div>

      {/* Cash Flow Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-lg font-medium text-gray-900 mb-3">영업활동</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">현금유입</span>
              <span className="font-medium text-green-600">+{summary.operating_inflow.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">현금유출</span>
              <span className="font-medium text-red-600">-{summary.operating_outflow.toLocaleString()}원</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>순현금흐름</span>
              <span className={summary.operating_net > 0 ? 'text-green-600' : 'text-red-600'}>
                {summary.operating_net.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-lg font-medium text-gray-900 mb-3">투자활동</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">현금유입</span>
              <span className="font-medium text-green-600">+{summary.investing_inflow.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">현금유출</span>
              <span className="font-medium text-red-600">-{summary.investing_outflow.toLocaleString()}원</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>순현금흐름</span>
              <span className={summary.investing_net > 0 ? 'text-green-600' : 'text-red-600'}>
                {summary.investing_net.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-lg font-medium text-gray-900 mb-3">재무활동</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">현금유입</span>
              <span className="font-medium text-green-600">+{summary.financing_inflow.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">현금유출</span>
              <span className="font-medium text-red-600">-{summary.financing_outflow.toLocaleString()}원</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>순현금흐름</span>
              <span className={summary.financing_net > 0 ? 'text-green-600' : 'text-red-600'}>
                {summary.financing_net.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Cashflow Trend */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">일별 현금흐름 추이</h3>
        <TrendChart
          data={daily_cashflow}
          type="line"
          dataKeys={[
            { dataKey: 'cash_inflow', name: '현금유입' },
            { dataKey: 'cash_outflow', name: '현금유출' },
            { dataKey: 'net_cashflow', name: '순현금흐름' }
          ]}
          xDataKey="date"
          height={350}
          formatYAxis="currency"
        />
      </div>

      {/* Cash Balance Trend */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">현금잔액 추이</h3>
        <TrendChart
          data={daily_cashflow}
          type="line"
          dataKeys={[
            { dataKey: 'ending_balance', name: '현금잔액' },
            { dataKey: 'minimum_required', name: '최소필요현금', dashStyle: [5, 5] }
          ]}
          xDataKey="date"
          height={300}
          colors={['#3B82F6', '#EF4444']}
          formatYAxis="currency"
        />
      </div>

      {/* Financial Ratios */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">주요 재무비율</h3>
        <DataTable
          columns={ratioColumns}
          data={financial_ratios}
          pageSize={15}
        />
      </div>

      {/* Cashflow Statement */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">현금흐름표</h3>
        <DataTable
          columns={cashflowColumns}
          data={cashflow_statement}
          pageSize={30}
        />
      </div>
    </div>
  );
}

export default Cashflow;