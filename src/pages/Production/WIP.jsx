import { useState, useEffect } from 'react';
import { productionAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { Loader, Clock, DollarSign, AlertCircle } from 'lucide-react';

function WIP() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productionAPI.getWIP();
      setData(response);
    } catch (err) {
      setError(err.message || '재공품 현황 데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;
  if (!data) return null;

  const { summary, wip_items, process_distribution, aging_analysis } = data;

  const wipColumns = [
    { key: 'work_order', label: '작업지시번호', sortable: true },
    { key: 'product_code', label: '제품코드', sortable: true },
    { key: 'product_name', label: '제품명', sortable: true },
    { key: 'current_process', label: '현재 공정', sortable: true },
    { key: 'quantity', label: '수량', format: 'number', sortable: true },
    { key: 'unit', label: '단위' },
    { key: 'start_date', label: '시작일', format: 'date', sortable: true },
    { key: 'elapsed_days', label: '경과일수', format: (value) => {
      const color = value > 7 ? 'text-red-600' : value > 3 ? 'text-yellow-600' : 'text-green-600';
      return <span className={`font-medium ${color}`}>{value}일</span>;
    }, sortable: true },
    { key: 'completion_rate', label: '진행률', format: (value) => {
      return (
        <div className="flex items-center gap-2">
          <div className="w-20 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="text-sm">{value}%</span>
        </div>
      );
    }, sortable: true },
    { key: 'wip_value', label: '재공품 가치', format: 'currency', sortable: true },
    { 
      key: 'status', 
      label: '상태',
      format: (value) => {
        const statusConfig = {
          '정상진행': { color: 'text-green-600 bg-green-50', label: '정상진행' },
          '지연': { color: 'text-red-600 bg-red-50', label: '지연' },
          '대기': { color: 'text-yellow-600 bg-yellow-50', label: '대기' },
          '품질검사': { color: 'text-blue-600 bg-blue-50', label: '품질검사' }
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

  const agingColumns = [
    { key: 'age_range', label: '경과일수 구간', sortable: true },
    { key: 'order_count', label: '작업지시 수', format: 'number', sortable: true },
    { key: 'total_quantity', label: '총 수량', format: 'number', sortable: true },
    { key: 'total_value', label: '총 가치', format: 'currency', sortable: true },
    { key: 'percentage', label: '비율', format: 'percentage', sortable: true }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">재공품 현황</h2>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="재공품 총액"
          value={summary.total_wip_value}
          format="currency"
          icon={DollarSign}
          iconColor="blue"
        />
        <KPICard
          title="진행중 작업"
          value={summary.active_orders}
          format="number"
          suffix="건"
          icon={Loader}
          iconColor="green"
        />
        <KPICard
          title="평균 체류시간"
          value={summary.avg_cycle_time}
          format="decimal"
          suffix="일"
          icon={Clock}
          iconColor="purple"
        />
        <KPICard
          title="지연 작업"
          value={summary.delayed_orders}
          format="number"
          suffix="건"
          icon={AlertCircle}
          iconColor="red"
        />
      </div>

      {/* Process Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">공정별 재공품 분포</h3>
          <TrendChart
            data={process_distribution}
            type="bar"
            dataKeys={[
              { dataKey: 'wip_count', name: '재공품 수량' }
            ]}
            xDataKey="process"
            height={300}
            colors={['#3B82F6']}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">공정별 재공품 가치</h3>
          <TrendChart
            data={process_distribution}
            type="bar"
            dataKeys={[
              { dataKey: 'wip_value', name: '재공품 가치' }
            ]}
            xDataKey="process"
            height={300}
            colors={['#8B5CF6']}
            formatYAxis="currency"
          />
        </div>
      </div>

      {/* Aging Analysis */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">재공품 체류시간 분석</h3>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          {aging_analysis.map((item, index) => {
            const colors = ['bg-green-50 text-green-700', 'bg-yellow-50 text-yellow-700', 'bg-orange-50 text-orange-700', 'bg-red-50 text-red-700'];
            return (
              <div key={index} className={`p-4 rounded-lg ${colors[index] || 'bg-gray-50 text-gray-700'}`}>
                <h4 className="font-medium">{item.age_range}</h4>
                <p className="text-2xl font-bold mt-1">{item.order_count}건</p>
                <p className="text-sm mt-1">{item.total_value.toLocaleString()}원</p>
              </div>
            );
          })}
        </div>
        <DataTable
          columns={agingColumns}
          data={aging_analysis}
          pageSize={10}
          showPagination={false}
        />
      </div>

      {/* WIP Details Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">재공품 상세 내역</h3>
        <DataTable
          columns={wipColumns}
          data={wip_items}
          pageSize={20}
        />
      </div>
    </div>
  );
}

export default WIP;