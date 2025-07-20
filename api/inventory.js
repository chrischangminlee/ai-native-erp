import { getDb } from '../lib/db.js';
import { getDateRange, calculatePercentage } from '../lib/helpers.js';
import { format, addDays } from 'date-fns';
import '../lib/init-db.js';

async function getDashboard(req, res) {
  const db = getDb();
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);

  const stockMetrics = await db.getAsync(`
    SELECT 
      SUM(quantity) as total_quantity,
      SUM(quantity * unit_value) as total_value,
      COUNT(DISTINCT product_id) as sku_count,
      COUNT(DISTINCT warehouse_id) as warehouse_count
    FROM inventory_stock
    WHERE quantity > 0
  `);

  const avgInventoryValue = await db.getAsync(`
    SELECT AVG(daily_value) as avg_value
    FROM (
      SELECT 
        DATE(transaction_date) as date,
        SUM(quantity * 
          CASE 
            WHEN transaction_type = 'in' THEN 1 
            WHEN transaction_type = 'out' THEN -1 
            ELSE 0 
          END * (SELECT unit_cost FROM products WHERE id = product_id)
        ) as daily_value
      FROM inventory_transactions
      WHERE transaction_date BETWEEN ? AND ?
      GROUP BY DATE(transaction_date)
    )
  `, [startDate, endDate]);

  const cogs = await db.getAsync(`
    SELECT SUM(p.unit_cost * soi.quantity) as cogs
    FROM sales_order_items soi
    JOIN products p ON soi.product_id = p.id
    JOIN sales_orders so ON soi.order_id = so.id
    WHERE so.order_date BETWEEN ? AND ?
      AND so.status != 'cancelled'
  `, [startDate, endDate]);

  const turnoverRate = cogs.cogs && avgInventoryValue.avg_value 
    ? (cogs.cogs / avgInventoryValue.avg_value).toFixed(2) 
    : 0;

  const daysOnHand = turnoverRate > 0 ? (365 / turnoverRate).toFixed(0) : 0;

  const stockAnalysis = await db.getAsync(`
    SELECT 
      COUNT(CASE WHEN quantity < safety_stock THEN 1 END) as below_safety,
      COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock,
      COUNT(CASE WHEN quantity > safety_stock * 2 THEN 1 END) as overstock
    FROM inventory_stock
  `);

  const monthlyTrend = await db.allAsync(`
    SELECT 
      strftime('%Y-%m', transaction_date) as month,
      SUM(CASE WHEN transaction_type = 'in' THEN quantity ELSE 0 END) as inbound,
      SUM(CASE WHEN transaction_type = 'out' THEN quantity ELSE 0 END) as outbound,
      SUM(CASE WHEN transaction_type = 'transfer' THEN quantity ELSE 0 END) as transfers
    FROM inventory_transactions
    WHERE transaction_date >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', transaction_date)
    ORDER BY month
  `);

  return {
    kpis: {
      total_value: {
        value: stockMetrics.total_value || 0,
        label: 'Total Inventory Value'
      },
      total_quantity: {
        value: stockMetrics.total_quantity || 0,
        label: 'Total Stock Quantity'
      },
      turnover_rate: {
        value: parseFloat(turnoverRate),
        label: 'Inventory Turnover'
      },
      days_on_hand: {
        value: parseInt(daysOnHand),
        label: 'Days on Hand'
      },
      below_safety_stock: {
        value: stockAnalysis.below_safety || 0,
        label: 'Items Below Safety Stock'
      },
      stock_accuracy: {
        value: calculatePercentage(
          stockMetrics.sku_count - stockAnalysis.out_of_stock,
          stockMetrics.sku_count
        ),
        label: 'Stock Accuracy %'
      }
    },
    trend: monthlyTrend,
    period: { startDate, endDate }
  };
}

async function getByItem(req, res) {
  // Return mock data in the expected format
  const { warehouse_id } = req.query;
  
  // Mock warehouses data
  const warehouses = [
    { id: 'W001', name: '서울 중앙 물류센터' },
    { id: 'W002', name: '부산 항만 창고' },
    { id: 'W003', name: '인천 공항 물류센터' },
    { id: 'W004', name: '대전 유통센터' }
  ];

  // Mock items data with Korean product names
  const items = [
    { 
      sku: 'SKU001', 
      name: '삼성 갤럭시 S24 울트라', 
      category: '전자제품',
      warehouse: warehouse_id === 'W001' ? '서울 중앙 물류센터' : '부산 항만 창고',
      quantity: 450,
      unit: 'EA',
      unit_cost: 1500000,
      total_value: 675000000,
      safety_stock: 100,
      status: '정상'
    },
    { 
      sku: 'SKU002', 
      name: 'LG 올레드 TV 65인치', 
      category: '전자제품',
      warehouse: warehouse_id === 'W002' ? '부산 항만 창고' : '인천 공항 물류센터',
      quantity: 85,
      unit: 'EA',
      unit_cost: 3200000,
      total_value: 272000000,
      safety_stock: 50,
      status: '부족'
    },
    { 
      sku: 'SKU003', 
      name: '농심 신라면 (박스)', 
      category: '식품',
      warehouse: warehouse_id === 'W003' ? '인천 공항 물류센터' : '대전 유통센터',
      quantity: 2500,
      unit: 'BOX',
      unit_cost: 15000,
      total_value: 37500000,
      safety_stock: 500,
      status: '정상'
    },
    { 
      sku: 'SKU004', 
      name: '아모레퍼시픽 설화수 세트', 
      category: '화장품',
      warehouse: '서울 중앙 물류센터',
      quantity: 320,
      unit: 'SET',
      unit_cost: 180000,
      total_value: 57600000,
      safety_stock: 100,
      status: '정상'
    },
    { 
      sku: 'SKU005', 
      name: '현대자동차 부품 - 엔진오일', 
      category: '자동차부품',
      warehouse: '부산 항만 창고',
      quantity: 1200,
      unit: 'L',
      unit_cost: 8500,
      total_value: 10200000,
      safety_stock: 300,
      status: '정상'
    },
    { 
      sku: 'SKU006', 
      name: '삼성 비스포크 냉장고', 
      category: '가전제품',
      warehouse: '인천 공항 물류센터',
      quantity: 45,
      unit: 'EA',
      unit_cost: 2800000,
      total_value: 126000000,
      safety_stock: 20,
      status: '정상'
    },
    { 
      sku: 'SKU007', 
      name: 'CJ 비비고 만두 (냉동)', 
      category: '식품',
      warehouse: '대전 유통센터',
      quantity: 3200,
      unit: 'PKG',
      unit_cost: 5500,
      total_value: 17600000,
      safety_stock: 1000,
      status: '정상'
    },
    { 
      sku: 'SKU008', 
      name: '나이키 운동화 에어맥스', 
      category: '의류/신발',
      warehouse: '서울 중앙 물류센터',
      quantity: 280,
      unit: 'PAIR',
      unit_cost: 120000,
      total_value: 33600000,
      safety_stock: 100,
      status: '정상'
    }
  ];

  // Filter items if warehouse_id is provided
  const filteredItems = warehouse_id && warehouse_id !== 'all' 
    ? items.filter(item => {
        const warehouseMap = {
          'W001': '서울 중앙 물류센터',
          'W002': '부산 항만 창고',
          'W003': '인천 공항 물류센터',
          'W004': '대전 유통센터'
        };
        return item.warehouse === warehouseMap[warehouse_id];
      })
    : items;

  // Mock summary data
  const summary = {
    total_items: filteredItems.length,
    total_quantity: filteredItems.reduce((sum, item) => sum + item.quantity, 0),
    total_value: filteredItems.reduce((sum, item) => sum + item.total_value, 0),
    low_stock_items: filteredItems.filter(item => item.status === '부족').length,
    categories: [...new Set(filteredItems.map(item => item.category))].length
  };

  return {
    summary,
    items: filteredItems,
    warehouses
  };
}

async function getExpiry(req, res) {
  // Return mock data in the expected format
  const { days_ahead = 90 } = req.query;
  const today = new Date();
  
  // Mock expiring items with Korean product names
  const expiringItems = [
    {
      sku: 'SKU020',
      name: '오리온 초코파이',
      category: '식품',
      warehouse: '서울 중앙 물류센터',
      lot_number: 'LOT20240315',
      quantity: 500,
      unit_value: 1200,
      value_at_risk: 600000,
      expiry_date: format(addDays(today, 15), 'yyyy-MM-dd'),
      days_to_expiry: 15,
      status: '임박'
    },
    {
      sku: 'SKU021',
      name: '서울우유 1L',
      category: '유제품',
      warehouse: '대전 유통센터',
      lot_number: 'LOT20240320',
      quantity: 300,
      unit_value: 2500,
      value_at_risk: 750000,
      expiry_date: format(addDays(today, 7), 'yyyy-MM-dd'),
      days_to_expiry: 7,
      status: '긴급'
    },
    {
      sku: 'SKU022',
      name: '풀무원 두부',
      category: '식품',
      warehouse: '부산 항만 창고',
      lot_number: 'LOT20240325',
      quantity: 200,
      unit_value: 3000,
      value_at_risk: 600000,
      expiry_date: format(addDays(today, 30), 'yyyy-MM-dd'),
      days_to_expiry: 30,
      status: '주의'
    },
    {
      sku: 'SKU023',
      name: '한국야쿠르트 (10개입)',
      category: '유제품',
      warehouse: '인천 공항 물류센터',
      lot_number: 'LOT20240328',
      quantity: 800,
      unit_value: 5000,
      value_at_risk: 4000000,
      expiry_date: format(addDays(today, 45), 'yyyy-MM-dd'),
      days_to_expiry: 45,
      status: '주의'
    },
    {
      sku: 'SKU024',
      name: '동원 참치캔',
      category: '식품',
      warehouse: '서울 중앙 물류센터',
      lot_number: 'LOT20240401',
      quantity: 1500,
      unit_value: 2000,
      value_at_risk: 3000000,
      expiry_date: format(addDays(today, 60), 'yyyy-MM-dd'),
      days_to_expiry: 60,
      status: '정상'
    }
  ];

  // Mock expired items
  const expiredItems = [
    {
      sku: 'SKU030',
      name: '빙그레 바나나우유',
      category: '유제품',
      warehouse: '서울 중앙 물류센터',
      lot_number: 'LOT20240201',
      quantity: 50,
      unit_value: 1500,
      value_at_risk: 75000,
      expiry_date: format(addDays(today, -5), 'yyyy-MM-dd'),
      days_to_expiry: -5,
      status: '만료'
    },
    {
      sku: 'SKU031',
      name: '삼립 크림빵',
      category: '식품',
      warehouse: '부산 항만 창고',
      lot_number: 'LOT20240205',
      quantity: 100,
      unit_value: 1000,
      value_at_risk: 100000,
      expiry_date: format(addDays(today, -3), 'yyyy-MM-dd'),
      days_to_expiry: -3,
      status: '만료'
    }
  ];

  // Filter items based on days_ahead
  const filteredExpiringItems = expiringItems.filter(item => item.days_to_expiry <= parseInt(days_ahead));

  // Mock summary data
  const summary = {
    total_expiring: filteredExpiringItems.length,
    total_expired: expiredItems.length,
    value_at_risk: filteredExpiringItems.reduce((sum, item) => sum + item.value_at_risk, 0),
    expired_value: expiredItems.reduce((sum, item) => sum + item.value_at_risk, 0),
    urgent_items: filteredExpiringItems.filter(item => item.days_to_expiry <= 7).length,
    categories_affected: [...new Set([...filteredExpiringItems, ...expiredItems].map(item => item.category))].length
  };

  return {
    summary,
    expiringItems: filteredExpiringItems,
    expiredItems
  };
}

async function getHistory(req, res) {
  // Return mock data in the expected format
  const { period = 'current-month' } = req.query;
  const { startDate, endDate } = getDateRange(period);
  
  // Mock transaction history with Korean product names
  const transactions = [
    {
      id: 'TRX001',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '14:30:00',
      transaction_type: '입고',
      sku: 'SKU001',
      product_name: '삼성 갤럭시 S24 울트라',
      warehouse: '서울 중앙 물류센터',
      quantity: 100,
      unit_cost: 1500000,
      total_value: 150000000,
      reference: 'PO2024-0315',
      user: '김민수'
    },
    {
      id: 'TRX002',
      date: format(addDays(new Date(), -1), 'yyyy-MM-dd'),
      time: '10:15:00',
      transaction_type: '출고',
      sku: 'SKU003',
      product_name: '농심 신라면 (박스)',
      warehouse: '대전 유통센터',
      quantity: 500,
      unit_cost: 15000,
      total_value: 7500000,
      reference: 'SO2024-1234',
      user: '이영희'
    },
    {
      id: 'TRX003',
      date: format(addDays(new Date(), -2), 'yyyy-MM-dd'),
      time: '16:45:00',
      transaction_type: '이동',
      sku: 'SKU002',
      product_name: 'LG 올레드 TV 65인치',
      warehouse: '부산 항만 창고 → 서울 중앙 물류센터',
      quantity: 20,
      unit_cost: 3200000,
      total_value: 64000000,
      reference: 'TRF2024-0089',
      user: '박철수'
    },
    {
      id: 'TRX004',
      date: format(addDays(new Date(), -3), 'yyyy-MM-dd'),
      time: '09:00:00',
      transaction_type: '입고',
      sku: 'SKU004',
      product_name: '아모레퍼시픽 설화수 세트',
      warehouse: '서울 중앙 물류센터',
      quantity: 50,
      unit_cost: 180000,
      total_value: 9000000,
      reference: 'PO2024-0310',
      user: '정수진'
    },
    {
      id: 'TRX005',
      date: format(addDays(new Date(), -4), 'yyyy-MM-dd'),
      time: '13:20:00',
      transaction_type: '출고',
      sku: 'SKU005',
      product_name: '현대자동차 부품 - 엔진오일',
      warehouse: '부산 항만 창고',
      quantity: 200,
      unit_cost: 8500,
      total_value: 1700000,
      reference: 'SO2024-1230',
      user: '최동욱'
    },
    {
      id: 'TRX006',
      date: format(addDays(new Date(), -5), 'yyyy-MM-dd'),
      time: '11:00:00',
      transaction_type: '조정',
      sku: 'SKU006',
      product_name: '삼성 비스포크 냉장고',
      warehouse: '인천 공항 물류센터',
      quantity: -2,
      unit_cost: 2800000,
      total_value: -5600000,
      reference: 'ADJ2024-0045',
      user: '한지민'
    }
  ];

  // Mock summary data
  const summary = {
    total_transactions: transactions.length,
    total_inbound: transactions.filter(t => t.transaction_type === '입고').reduce((sum, t) => sum + t.quantity, 0),
    total_outbound: transactions.filter(t => t.transaction_type === '출고').reduce((sum, t) => sum + t.quantity, 0),
    total_transfers: transactions.filter(t => t.transaction_type === '이동').reduce((sum, t) => sum + t.quantity, 0),
    total_adjustments: transactions.filter(t => t.transaction_type === '조정').length,
    total_value_change: transactions.reduce((sum, t) => {
      if (t.transaction_type === '입고') return sum + t.total_value;
      if (t.transaction_type === '출고') return sum - t.total_value;
      if (t.transaction_type === '조정') return sum + t.total_value;
      return sum;
    }, 0)
  };

  // Mock daily trend data
  const dailyTrend = [
    { date: format(new Date(), 'yyyy-MM-dd'), inbound: 100, outbound: 80, transfers: 20 },
    { date: format(addDays(new Date(), -1), 'yyyy-MM-dd'), inbound: 150, outbound: 120, transfers: 30 },
    { date: format(addDays(new Date(), -2), 'yyyy-MM-dd'), inbound: 200, outbound: 180, transfers: 25 },
    { date: format(addDays(new Date(), -3), 'yyyy-MM-dd'), inbound: 120, outbound: 100, transfers: 15 },
    { date: format(addDays(new Date(), -4), 'yyyy-MM-dd'), inbound: 180, outbound: 160, transfers: 20 },
    { date: format(addDays(new Date(), -5), 'yyyy-MM-dd'), inbound: 90, outbound: 70, transfers: 10 },
    { date: format(addDays(new Date(), -6), 'yyyy-MM-dd'), inbound: 110, outbound: 95, transfers: 18 }
  ];

  return {
    transactions,
    summary,
    dailyTrend
  };
}

async function getValuation(req, res) {
  // Return mock data in the expected format
  const { method = 'FIFO' } = req.query;
  
  // Mock valuation by category
  const valuationByCategory = [
    {
      category: '전자제품',
      quantity: 535,
      fifo_value: 1073000000,
      lifo_value: 1180300000,
      average_value: 1126650000,
      percentage: 45.2
    },
    {
      category: '식품',
      quantity: 5700,
      fifo_value: 55100000,
      lifo_value: 60610000,
      average_value: 57855000,
      percentage: 2.3
    },
    {
      category: '가전제품',
      quantity: 45,
      fifo_value: 126000000,
      lifo_value: 138600000,
      average_value: 132300000,
      percentage: 5.3
    },
    {
      category: '화장품',
      quantity: 320,
      fifo_value: 57600000,
      lifo_value: 63360000,
      average_value: 60480000,
      percentage: 2.4
    },
    {
      category: '자동차부품',
      quantity: 1200,
      fifo_value: 10200000,
      lifo_value: 11220000,
      average_value: 10710000,
      percentage: 0.4
    },
    {
      category: '의류/신발',
      quantity: 280,
      fifo_value: 33600000,
      lifo_value: 36960000,
      average_value: 35280000,
      percentage: 1.4
    }
  ];

  // Mock valuation by warehouse
  const valuationByWarehouse = [
    {
      warehouse: '서울 중앙 물류센터',
      quantity: 2850,
      value: 923200000,
      percentage: 38.9
    },
    {
      warehouse: '부산 항만 창고',
      quantity: 1805,
      value: 348200000,
      percentage: 14.7
    },
    {
      warehouse: '인천 공항 물류센터',
      quantity: 1170,
      value: 424600000,
      percentage: 17.9
    },
    {
      warehouse: '대전 유통센터',
      quantity: 2500,
      value: 55100000,
      percentage: 2.3
    }
  ];

  // Mock individual items for valuation
  const items = [
    {
      sku: 'SKU001',
      name: '삼성 갤럭시 S24 울트라',
      category: '전자제품',
      quantity: 450,
      fifo_cost: 1500000,
      lifo_cost: 1650000,
      average_cost: 1575000,
      total_value: method === 'FIFO' ? 675000000 : method === 'LIFO' ? 742500000 : 708750000
    },
    {
      sku: 'SKU002',
      name: 'LG 올레드 TV 65인치',
      category: '전자제품',
      quantity: 85,
      fifo_cost: 3200000,
      lifo_cost: 3520000,
      average_cost: 3360000,
      total_value: method === 'FIFO' ? 272000000 : method === 'LIFO' ? 299200000 : 285600000
    },
    {
      sku: 'SKU006',
      name: '삼성 비스포크 냉장고',
      category: '가전제품',
      quantity: 45,
      fifo_cost: 2800000,
      lifo_cost: 3080000,
      average_cost: 2940000,
      total_value: method === 'FIFO' ? 126000000 : method === 'LIFO' ? 138600000 : 132300000
    }
  ];

  // Calculate total value based on selected method
  const totalValue = valuationByCategory.reduce((sum, cat) => {
    return sum + (method === 'FIFO' ? cat.fifo_value : method === 'LIFO' ? cat.lifo_value : cat.average_value);
  }, 0);

  // Mock trend data
  const trend = [
    { month: '2024-01', value: 2100000000 },
    { month: '2024-02', value: 2250000000 },
    { month: '2024-03', value: 2180000000 },
    { month: '2024-04', value: 2320000000 },
    { month: '2024-05', value: 2450000000 },
    { month: '2024-06', value: 2370000000 }
  ];

  // Mock summary data
  const summary = {
    total_value: totalValue,
    method: method,
    inventory_turnover: 4.2,
    days_on_hand: 87,
    inventory_to_sales_ratio: 1.8,
    last_updated: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  };

  return {
    summary,
    valuationByCategory: valuationByCategory.map(cat => ({
      ...cat,
      value: method === 'FIFO' ? cat.fifo_value : method === 'LIFO' ? cat.lifo_value : cat.average_value
    })),
    valuationByWarehouse,
    items,
    trend
  };
}

async function getRisk(req, res) {
  // Return mock data in the expected format
  
  // Mock risk items with Korean product names
  const riskItems = [
    {
      sku: 'SKU040',
      name: '한성 노트북 구형 모델',
      category: '전자제품',
      warehouse: '서울 중앙 물류센터',
      quantity: 120,
      unit_value: 650000,
      total_value: 78000000,
      risk_type: '재고 과다',
      risk_level: '높음',
      days_since_movement: 180,
      turnover_rate: 0.5,
      recommendation: '할인 판매 또는 반품 협의 필요'
    },
    {
      sku: 'SKU041',
      name: '동아제약 박카스 (유통기한 임박)',
      category: '식품',
      warehouse: '대전 유통센터',
      quantity: 2000,
      unit_value: 800,
      total_value: 1600000,
      risk_type: '유통기한 임박',
      risk_level: '긴급',
      days_to_expiry: 15,
      expiry_date: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
      recommendation: '긴급 할인 판매 필요'
    },
    {
      sku: 'SKU042',
      name: '코오롱 스포츠 동계 재킷',
      category: '의류/신발',
      warehouse: '부산 항만 창고',
      quantity: 300,
      unit_value: 180000,
      total_value: 54000000,
      risk_type: '계절성 재고',
      risk_level: '중간',
      days_since_movement: 90,
      seasonal_demand: '낮음',
      recommendation: '다음 시즌까지 보관 또는 할인 판매'
    },
    {
      sku: 'SKU043',
      name: 'LG 구형 스마트폰 액세서리',
      category: '전자제품',
      warehouse: '인천 공항 물류센터',
      quantity: 500,
      unit_value: 25000,
      total_value: 12500000,
      risk_type: '진부화',
      risk_level: '높음',
      obsolescence_risk: '매우 높음',
      days_since_movement: 240,
      recommendation: '폐기 또는 대량 할인 처분'
    },
    {
      sku: 'SKU044',
      name: '아모레 화장품 한정판',
      category: '화장품',
      warehouse: '서울 중앙 물류센터',
      quantity: 150,
      unit_value: 85000,
      total_value: 12750000,
      risk_type: '저회전',
      risk_level: '중간',
      days_since_movement: 120,
      turnover_rate: 1.2,
      recommendation: '마케팅 프로모션 필요'
    },
    {
      sku: 'SKU045',
      name: '현대 자동차 부품 (단종 예정)',
      category: '자동차부품',
      warehouse: '부산 항만 창고',
      quantity: 800,
      unit_value: 45000,
      total_value: 36000000,
      risk_type: '단종 예정',
      risk_level: '높음',
      discontinuation_date: '2024-12-31',
      days_until_discontinuation: 180,
      recommendation: '재고 소진 계획 수립 필요'
    }
  ];

  // Mock summary data
  const summary = {
    total_risk_items: riskItems.length,
    total_value_at_risk: riskItems.reduce((sum, item) => sum + item.total_value, 0),
    high_risk_items: riskItems.filter(item => item.risk_level === '높음').length,
    urgent_risk_items: riskItems.filter(item => item.risk_level === '긴급').length,
    categories_affected: [...new Set(riskItems.map(item => item.category))].length,
    warehouses_affected: [...new Set(riskItems.map(item => item.warehouse))].length,
    estimated_monthly_holding_cost: 24500000,
    potential_write_off_value: 45000000,
    risk_breakdown: {
      overstock: riskItems.filter(item => item.risk_type === '재고 과다').length,
      expiring: riskItems.filter(item => item.risk_type === '유통기한 임박').length,
      obsolete: riskItems.filter(item => item.risk_type === '진부화').length,
      seasonal: riskItems.filter(item => item.risk_type === '계절성 재고').length,
      slow_moving: riskItems.filter(item => item.risk_type === '저회전').length,
      discontinuing: riskItems.filter(item => item.risk_type === '단종 예정').length
    }
  };

  return {
    summary,
    riskItems
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.query;

  try {
    let result;
    
    switch (action) {
      case 'dashboard':
        result = await getDashboard(req, res);
        break;
      case 'by-item':
        result = await getByItem(req, res);
        break;
      case 'expiry':
        result = await getExpiry(req, res);
        break;
      case 'history':
        result = await getHistory(req, res);
        break;
      case 'valuation':
        result = await getValuation(req, res);
        break;
      case 'risk':
        result = await getRisk(req, res);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in inventory handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}