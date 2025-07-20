import { useState, useEffect } from 'react';
import { inventoryAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import PeriodSelector from '../../components/PeriodSelector';
import { ArrowUpCircle, ArrowDownCircle, ArrowRightCircle, FileText } from 'lucide-react';

function History() {
  const [period, setPeriod] = useState('current-month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryAPI.getHistory(period);
      setData(response);
    } catch (err) {
      setError(err.message || '입출고 이력 데이터를 불러오는데 실패했습니다');
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

  const { transactions, summary, dailyTrend } = data;

  const columns = [
    { 
      key: 'transaction_date', 
      label: '거래일시', 
      format: (value) => new Date(value).toLocaleString('ko-KR'),
      sortable: true 
    },
    { key: 'transaction_id', label: '거래번호', sortable: true },
    { 
      key: 'type', 
      label: '구분', 
      format: (value) => {
        const types = {
          'inbound': { label: '입고', icon: ArrowDownCircle, color: 'text-green-600' },
          'outbound': { label: '출고', icon: ArrowUpCircle, color: 'text-red-600' },
          'transfer': { label: '이동', icon: ArrowRightCircle, color: 'text-blue-600' },
          'adjustment': { label: '조정', icon: FileText, color: 'text-purple-600' }
        };
        const typeInfo = types[value] || { label: value, color: 'text-gray-600' };
        const Icon = typeInfo.icon;
        return (
          <span className={`flex items-center gap-1 ${typeInfo.color}`}>
            {Icon && <Icon className="w-4 h-4" />}
            {typeInfo.label}
          </span>
        );
      },
      sortable: true
    },
    { key: 'sku', label: '품목코드', sortable: true },
    { key: 'name', label: '품목명', sortable: true },
    { key: 'quantity', label: '수량', format: 'number', sortable: true },
    { key: 'unit', label: '단위' },
    { key: 'warehouse_from', label: '출발 창고', sortable: true },
    { key: 'warehouse_to', label: '도착 창고', sortable: true },
    { key: 'reference_doc', label: '관련 문서', sortable: true },
    { key: 'user_name', label: '담당자', sortable: true },
    { key: 'notes', label: '비고' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">입출고 이력</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">총 입고</p>
              <p className="text-2xl font-bold text-green-600">{summary.total_inbound.toLocaleString()}</p>
            </div>
            <ArrowDownCircle className="w-8 h-8 text-green-600 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">총 출고</p>
              <p className="text-2xl font-bold text-red-600">{summary.total_outbound.toLocaleString()}</p>
            </div>
            <ArrowUpCircle className="w-8 h-8 text-red-600 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">총 이동</p>
              <p className="text-2xl font-bold text-blue-600">{summary.total_transfer.toLocaleString()}</p>
            </div>
            <ArrowRightCircle className="w-8 h-8 text-blue-600 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">총 거래건수</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_transactions.toLocaleString()}</p>
            </div>
            <FileText className="w-8 h-8 text-gray-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Daily Trend Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">일별 입출고 추이</h3>
        <TrendChart
          data={dailyTrend}
          type="bar"
          dataKeys={[
            { dataKey: 'inbound', name: '입고', color: '#10B981' },
            { dataKey: 'outbound', name: '출고', color: '#EF4444' },
            { dataKey: 'transfer', name: '이동', color: '#3B82F6' }
          ]}
          xDataKey="date"
          height={300}
          stacked={false}
        />
      </div>

      {/* Transaction History Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">거래 내역</h3>
        <DataTable
          columns={columns}
          data={transactions}
          pageSize={20}
        />
      </div>
    </div>
  );
}

export default History;