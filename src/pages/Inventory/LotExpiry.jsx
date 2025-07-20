import { useState, useEffect } from 'react';
import { inventoryAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { Calendar, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

function LotExpiry() {
  const [daysAhead, setDaysAhead] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryAPI.getExpiry(daysAhead);
      setData(response);
    } catch (err) {
      setError(err.message || '로트 및 유효기간 데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [daysAhead]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;
  if (!data) return null;

  const { summary, expiringItems, expiredItems } = data;

  const expiringColumns = [
    { key: 'lot_number', label: '로트 번호', sortable: true },
    { key: 'sku', label: '품목 코드', sortable: true },
    { key: 'name', label: '품목명', sortable: true },
    { key: 'warehouse', label: '창고', sortable: true },
    { key: 'quantity', label: '수량', format: 'number', sortable: true },
    { key: 'unit', label: '단위' },
    { key: 'production_date', label: '생산일', format: 'date', sortable: true },
    { key: 'expiry_date', label: '유효기간', format: 'date', sortable: true },
    { key: 'days_until_expiry', label: '잔여일수', format: (value) => {
      const colorClass = value <= 7 ? 'text-red-600' : value <= 30 ? 'text-yellow-600' : 'text-green-600';
      return <span className={`font-medium ${colorClass}`}>{value}일</span>;
    }, sortable: true }
  ];

  const expiredColumns = [
    { key: 'lot_number', label: '로트 번호', sortable: true },
    { key: 'sku', label: '품목 코드', sortable: true },
    { key: 'name', label: '품목명', sortable: true },
    { key: 'warehouse', label: '창고', sortable: true },
    { key: 'quantity', label: '수량', format: 'number', sortable: true },
    { key: 'expiry_date', label: '만료일', format: 'date', sortable: true },
    { key: 'days_expired', label: '경과일수', format: (value) => (
      <span className="text-red-600 font-medium">{value}일 경과</span>
    ), sortable: true },
    { key: 'disposal_status', label: '처리상태', format: (value) => {
      const statusColors = {
        '대기': 'text-gray-600 bg-gray-50',
        '처리중': 'text-yellow-600 bg-yellow-50',
        '완료': 'text-green-600 bg-green-50'
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value] || ''}`}>
          {value}
        </span>
      );
    }}
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">로트 및 유효기간 관리</h2>
        <select
          value={daysAhead}
          onChange={(e) => setDaysAhead(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={7}>7일 이내</option>
          <option value={30}>30일 이내</option>
          <option value={60}>60일 이내</option>
          <option value={90}>90일 이내</option>
        </select>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="만료 예정 로트"
          value={summary.expiring_lots}
          format="number"
          suffix="개"
          icon={Clock}
          iconColor="yellow"
        />
        <KPICard
          title="만료된 로트"
          value={summary.expired_lots}
          format="number"
          suffix="개"
          icon={AlertTriangle}
          iconColor="red"
        />
        <KPICard
          title="영향받는 재고 가치"
          value={summary.affected_value}
          format="currency"
          icon={Calendar}
          iconColor="blue"
        />
        <KPICard
          title="처리 완료율"
          value={summary.disposal_rate}
          format="percentage"
          icon={CheckCircle}
          iconColor="green"
        />
      </div>

      {/* Expiring Items */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          만료 예정 품목 ({daysAhead}일 이내)
        </h3>
        <DataTable
          columns={expiringColumns}
          data={expiringItems}
          pageSize={10}
        />
      </div>

      {/* Expired Items */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">만료된 품목</h3>
        <DataTable
          columns={expiredColumns}
          data={expiredItems}
          pageSize={10}
        />
      </div>
    </div>
  );
}

export default LotExpiry;