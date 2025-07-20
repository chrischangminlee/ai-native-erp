import { useState, useEffect } from 'react';
import { inventoryAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { Package, AlertTriangle, TrendingUp, Archive } from 'lucide-react';

function ByItem() {
  const [warehouseId, setWarehouseId] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryAPI.getByItem(warehouseId);
      setData(response);
    } catch (err) {
      setError(err.message || '품목별 재고 데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [warehouseId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;
  if (!data) return null;

  const { summary, items, warehouses } = data;

  const columns = [
    { key: 'sku', label: '품목 코드', sortable: true },
    { key: 'name', label: '품목명', sortable: true },
    { key: 'category', label: '카테고리', sortable: true },
    { key: 'warehouse', label: '창고', sortable: true },
    { key: 'quantity', label: '재고 수량', format: 'number', sortable: true },
    { key: 'unit', label: '단위', sortable: false },
    { key: 'unit_cost', label: '단가', format: 'currency', sortable: true },
    { key: 'total_value', label: '재고 금액', format: 'currency', sortable: true },
    { key: 'safety_stock', label: '안전재고', format: 'number', sortable: true },
    { key: 'status', label: '상태', format: (value) => {
      const statusColors = {
        '정상': 'text-green-600 bg-green-50',
        '부족': 'text-yellow-600 bg-yellow-50',
        '초과': 'text-blue-600 bg-blue-50',
        '재고없음': 'text-red-600 bg-red-50'
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
        <h2 className="text-2xl font-bold text-gray-900">품목별 재고 현황</h2>
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">전체 창고</option>
          {warehouses?.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="총 품목 수"
          value={summary.total_items}
          format="number"
          suffix="개"
          icon={Package}
          iconColor="blue"
        />
        <KPICard
          title="재고 부족 품목"
          value={summary.low_stock_items}
          format="number"
          suffix="개"
          icon={AlertTriangle}
          iconColor="red"
        />
        <KPICard
          title="재고 회전율"
          value={summary.avg_turnover_rate}
          format="decimal"
          suffix="회"
          icon={TrendingUp}
          iconColor="green"
        />
        <KPICard
          title="재고 정확도"
          value={summary.stock_accuracy}
          format="percentage"
          icon={Archive}
          iconColor="purple"
        />
      </div>

      {/* Items Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">재고 품목 목록</h3>
        <DataTable
          columns={columns}
          data={items}
          pageSize={20}
        />
      </div>
    </div>
  );
}

export default ByItem;