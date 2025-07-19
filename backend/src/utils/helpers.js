import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export function getDateRange(period = 'current-month') {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'current-month':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case 'last-month':
      const lastMonth = subMonths(now, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
      break;
    case 'last-3-months':
      startDate = startOfMonth(subMonths(now, 2));
      endDate = endOfMonth(now);
      break;
    case 'last-6-months':
      startDate = startOfMonth(subMonths(now, 5));
      endDate = endOfMonth(now);
      break;
    case 'last-12-months':
      startDate = startOfMonth(subMonths(now, 11));
      endDate = endOfMonth(now);
      break;
    default:
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
  }

  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  };
}

export function calculateYoY(current, previous) {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous * 100).toFixed(2);
}

export function calculatePercentage(part, total) {
  if (!total || total === 0) return 0;
  return ((part / total) * 100).toFixed(2);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function groupByMonth(data, dateField, valueField) {
  const grouped = {};
  
  data.forEach(item => {
    const month = format(new Date(item[dateField]), 'yyyy-MM');
    if (!grouped[month]) {
      grouped[month] = { month, total: 0, count: 0 };
    }
    grouped[month].total += parseFloat(item[valueField] || 0);
    grouped[month].count += 1;
  });

  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
}

export function calculateMovingAverage(data, periods = 3) {
  if (data.length < periods) return data;
  
  return data.map((item, index) => {
    if (index < periods - 1) {
      return { ...item, movingAverage: null };
    }
    
    const sum = data
      .slice(index - periods + 1, index + 1)
      .reduce((acc, curr) => acc + curr.value, 0);
    
    return {
      ...item,
      movingAverage: (sum / periods).toFixed(2),
    };
  });
}

export function generateForecast(historicalData, periods = 3) {
  if (historicalData.length < 3) {
    return [];
  }

  // Simple linear trend forecast
  const n = historicalData.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = historicalData.map(d => d.value);
  
  const sumX = x.reduce((a, b) => a + b);
  const sumY = y.reduce((a, b) => a + b);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const forecast = [];
  const lastDate = new Date(historicalData[n - 1].date);
  
  for (let i = 1; i <= periods; i++) {
    const forecastValue = slope * (n - 1 + i) + intercept;
    const forecastDate = format(new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1), 'yyyy-MM-dd');
    
    forecast.push({
      date: forecastDate,
      value: Math.max(0, forecastValue.toFixed(2)),
      type: 'forecast',
      confidence_lower: Math.max(0, (forecastValue * 0.9).toFixed(2)),
      confidence_upper: (forecastValue * 1.1).toFixed(2),
    });
  }
  
  return forecast;
}