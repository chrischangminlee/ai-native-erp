import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function KPICard({ title, value, unit = '', trend, trendValue, format = 'number' }) {
  const formatValue = (val) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    } else if (format === 'percentage') {
      return `${val}%`;
    } else if (format === 'number') {
      return new Intl.NumberFormat('en-US').format(val);
    }
    return val;
  };

  const getTrendIcon = () => {
    if (!trend || trend === 0) return <Minus className="w-4 h-4 text-gray-400" />;
    return trend > 0 ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-500" />
    );
  };

  const getTrendColor = () => {
    if (!trend || trend === 0) return 'text-gray-600';
    return trend > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatValue(value)}{unit && <span className="text-xl ml-1">{unit}</span>}
          </p>
          {trendValue !== undefined && (
            <div className={`mt-2 flex items-center text-sm ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="ml-1">
                {Math.abs(trendValue)}% {trend > 0 ? '증가' : trend < 0 ? '감소' : '변화없음'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KPICard;