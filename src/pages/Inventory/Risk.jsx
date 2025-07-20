import { useState, useEffect } from 'react';
import { inventoryAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { AlertTriangle, TrendingDown, Clock, ShieldAlert, AlertCircle, XCircle } from 'lucide-react';

function Risk() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryAPI.getRisk();
      setData(response);
    } catch (err) {
      setError(err.message || '위험 모니터 데이터를 불러오는데 실패했습니다');
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

  const { summary, riskItems } = data;

  const getRiskLevel = (level) => {
    const levels = {
      'critical': { label: '심각', color: 'text-red-600 bg-red-50', icon: XCircle },
      'high': { label: '높음', color: 'text-orange-600 bg-orange-50', icon: AlertTriangle },
      'medium': { label: '보통', color: 'text-yellow-600 bg-yellow-50', icon: AlertCircle },
      'low': { label: '낮음', color: 'text-blue-600 bg-blue-50', icon: ShieldAlert }
    };
    return levels[level] || levels.medium;
  };

  const columns = [
    { 
      key: 'risk_level', 
      label: '위험도',
      format: (value) => {
        const level = getRiskLevel(value);
        const Icon = level.icon;
        return (
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${level.color}`}>
            <Icon className="w-3 h-3" />
            {level.label}
          </span>
        );
      },
      sortable: true
    },
    { key: 'risk_type', label: '위험 유형', sortable: true },
    { key: 'sku', label: '품목코드', sortable: true },
    { key: 'name', label: '품목명', sortable: true },
    { key: 'warehouse', label: '창고', sortable: true },
    { key: 'current_stock', label: '현재고', format: 'number', sortable: true },
    { key: 'safety_stock', label: '안전재고', format: 'number', sortable: true },
    { key: 'days_of_supply', label: '재고일수', format: (value) => `${value}일`, sortable: true },
    { key: 'risk_value', label: '위험 금액', format: 'currency', sortable: true },
    { key: 'recommendation', label: '권장 조치' },
    { 
      key: 'status', 
      label: '처리상태',
      format: (value) => {
        const statusColors = {
          '미처리': 'text-gray-600 bg-gray-50',
          '진행중': 'text-blue-600 bg-blue-50',
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

  const filteredItems = activeFilter === 'all' 
    ? riskItems 
    : riskItems.filter(item => item.risk_type === activeFilter);

  const riskTypes = [
    { id: 'all', label: '전체', count: riskItems.length },
    { id: '재고부족', label: '재고부족', count: riskItems.filter(i => i.risk_type === '재고부족').length },
    { id: '과잉재고', label: '과잉재고', count: riskItems.filter(i => i.risk_type === '과잉재고').length },
    { id: '유효기간임박', label: '유효기간임박', count: riskItems.filter(i => i.risk_type === '유효기간임박').length },
    { id: '장기체화', label: '장기체화', count: riskItems.filter(i => i.risk_type === '장기체화').length }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">재고 위험 모니터</h2>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* Risk Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="심각 위험 항목"
          value={summary.critical_items}
          format="number"
          suffix="개"
          icon={XCircle}
          iconColor="red"
        />
        <KPICard
          title="재고 부족 품목"
          value={summary.stockout_risk}
          format="number"
          suffix="개"
          icon={TrendingDown}
          iconColor="orange"
        />
        <KPICard
          title="유효기간 임박"
          value={summary.expiry_risk}
          format="number"
          suffix="개"
          icon={Clock}
          iconColor="yellow"
        />
        <KPICard
          title="총 위험 금액"
          value={summary.total_risk_value}
          format="currency"
          icon={AlertTriangle}
          iconColor="purple"
        />
      </div>

      {/* Risk Type Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-2">
          {riskTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setActiveFilter(type.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeFilter === type.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.label} ({type.count})
            </button>
          ))}
        </div>
      </div>

      {/* Risk Distribution by Type */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-red-900">재고 부족</h4>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{summary.stockout_risk}</p>
          <p className="text-sm text-red-700 mt-1">즉시 발주 필요</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-orange-900">과잉 재고</h4>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{summary.overstock_risk}</p>
          <p className="text-sm text-orange-700 mt-1">처분 검토 필요</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-yellow-900">유효기간 임박</h4>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{summary.expiry_risk}</p>
          <p className="text-sm text-yellow-700 mt-1">30일 이내 만료</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-purple-900">장기 체화</h4>
            <ShieldAlert className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{summary.slow_moving}</p>
          <p className="text-sm text-purple-700 mt-1">6개월 이상 미이동</p>
        </div>
      </div>

      {/* Risk Items Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">위험 항목 상세</h3>
        <DataTable
          columns={columns}
          data={filteredItems}
          pageSize={20}
        />
      </div>
    </div>
  );
}

export default Risk;