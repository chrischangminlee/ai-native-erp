import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

function TrendChart({
  data,
  type = 'line',
  dataKeys,
  xDataKey = 'month',
  height = 300,
  showLegend = true,
  showGrid = true,
  formatYAxis,
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
}) {
  const formatTooltipValue = (value) => {
    if (formatYAxis === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(value);
    } else if (formatYAxis === 'percentage') {
      return `${value}%`;
    }
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatAxisTick = (value) => {
    if (formatYAxis === 'currency') {
      return `$${(value / 1000).toFixed(0)}k`;
    } else if (formatYAxis === 'percentage') {
      return `${value}%`;
    }
    return value > 1000 ? `${(value / 1000).toFixed(0)}k` : value;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const chartComponents = dataKeys.map((key, index) => {
      const color = colors[index % colors.length];
      
      switch (type) {
        case 'bar':
          return <Bar key={key.dataKey} dataKey={key.dataKey} name={key.name} fill={color} />;
        case 'area':
          return (
            <Area
              key={key.dataKey}
              type="monotone"
              dataKey={key.dataKey}
              name={key.name}
              stroke={color}
              fill={color}
              fillOpacity={0.3}
            />
          );
        default:
          return (
            <Line
              key={key.dataKey}
              type="monotone"
              dataKey={key.dataKey}
              name={key.name}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          );
      }
    });

    const ChartComponent = type === 'bar' ? BarChart : type === 'area' ? AreaChart : LineChart;

    return (
      <ChartComponent {...commonProps}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
        <XAxis 
          dataKey={xDataKey} 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => {
            if (value.includes('-')) {
              const date = new Date(value + '-01');
              return format(date, 'MMM yy');
            }
            return value;
          }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={formatAxisTick}
        />
        <Tooltip
          formatter={formatTooltipValue}
          labelFormatter={(label) => {
            if (label.includes('-')) {
              const date = new Date(label + '-01');
              return format(date, 'MMMM yyyy');
            }
            return label;
          }}
        />
        {showLegend && <Legend />}
        {chartComponents}
      </ChartComponent>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

export default TrendChart;