import { useState, useEffect } from 'react';
import { inventoryAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import TrendChart from '../../components/TrendChart';
import KPICard from '../../components/KPICard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { DollarSign, TrendingUp, Package, Calculator } from 'lucide-react';

function Valuation() {
  const [method, setMethod] = useState('fifo');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryAPI.getValuation(method);
      setData(response);
    } catch (err) {
      setError(err.message || '재고 평가 데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [method]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;
  if (!data) return null;

  const { summary, valuationByCategory, valuationByWarehouse, items, trend } = data;

  const itemColumns = [
    { key: 'sku', label: '품목코드', sortable: true },
    { key: 'name', label: '품목명', sortable: true },
    { key: 'category', label: '카테고리', sortable: true },
    { key: 'quantity', label: '재고수량', format: 'number', sortable: true },
    { key: 'unit_cost', label: '단위원가', format: 'currency', sortable: true },
    { key: 'total_value', label: '재고금액', format: 'currency', sortable: true },
    { key: 'value_percentage', label: '구성비', format: 'percentage', sortable: true },
    { 
      key: 'abc_class', 
      label: 'ABC등급',
      format: (value) => {
        const classColors = {
          'A': 'text-red-600 bg-red-50',
          'B': 'text-yellow-600 bg-yellow-50',
          'C': 'text-green-600 bg-green-50'
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${classColors[value] || ''}`}>
            {value}등급
          </span>
        );
      }
    }
  ];

  const categoryColumns = [
    { key: 'category', label: '카테고리', sortable: true },
    { key: 'item_count', label: '품목수', format: 'number', sortable: true },
    { key: 'total_quantity', label: '총수량', format: 'number', sortable: true },
    { key: 'total_value', label: '총금액', format: 'currency', sortable: true },
    { key: 'value_percentage', label: '구성비', format: 'percentage', sortable: true }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">재고 평가</h2>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="fifo">선입선출 (FIFO)</option>
          <option value="lifo">후입선출 (LIFO)</option>
          <option value="average">평균법</option>
        </select>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="총 재고 가치"
          value={summary.total_value}
          format="currency"
          icon={DollarSign}
          iconColor="blue"
        />
        <KPICard
          title="평균 재고 단가"
          value={summary.avg_unit_cost}
          format="currency"
          icon={Calculator}
          iconColor="purple"
        />
        <KPICard
          title="재고 회전율"
          value={summary.inventory_turnover}
          format="decimal"
          suffix="회"
          icon={TrendingUp}
          iconColor="green"
        />
        <KPICard
          title="ABC A등급 비중"
          value={summary.a_class_percentage}
          format="percentage"
          icon={Package}
          iconColor="red"
        />
      </div>

      {/* Value Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">카테고리별 재고 가치</h3>
          <TrendChart
            data={valuationByCategory}
            type="bar"
            dataKeys={[
              { dataKey: 'value', name: '재고 가치' }
            ]}
            xDataKey="category"
            height={300}
            colors={['#3B82F6']}
            formatYAxis="currency"
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">창고별 재고 가치</h3>
          <TrendChart
            data={valuationByWarehouse}
            type="bar"
            dataKeys={[
              { dataKey: 'value', name: '재고 가치' }
            ]}
            xDataKey="warehouse"
            height={300}
            colors={['#10B981']}
            formatYAxis="currency"
          />
        </div>
      </div>

      {/* Monthly Trend */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">월별 재고 가치 추이</h3>
        <TrendChart
          data={trend}
          type="line"
          dataKeys={[
            { dataKey: 'total_value', name: '총 재고 가치' },
            { dataKey: 'avg_value', name: '평균 재고 가치' }
          ]}
          xDataKey="month"
          height={300}
          formatYAxis="currency"
        />
      </div>

      {/* Category Summary Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">카테고리별 평가 요약</h3>
        <DataTable
          columns={categoryColumns}
          data={valuationByCategory}
          pageSize={10}
        />
      </div>

      {/* Item Detail Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">품목별 재고 평가 ({method.toUpperCase()})</h3>
        <DataTable
          columns={itemColumns}
          data={items}
          pageSize={20}
        />
      </div>
    </div>
  );
}

export default Valuation;