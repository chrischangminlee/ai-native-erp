import { useState, useEffect } from 'react';
import { salesAPI } from '../../services/api';
import TrendChart from '../../components/TrendChart';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { TrendingUp, AlertCircle } from 'lucide-react';

function Forecast() {
  const [periods, setPeriods] = useState(3);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesAPI.getForecast(periods);
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to fetch forecast data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periods]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;
  if (!data) return null;

  const { historical, forecast, method, confidence_level } = data;

  // Combine historical and forecast data for chart
  const chartData = [
    ...historical.map(item => ({
      ...item,
      type: 'historical',
      forecast_value: null,
      confidence_lower: null,
      confidence_upper: null
    })),
    ...forecast.map(item => ({
      ...item,
      value: null,
      forecast_value: item.value
    }))
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Sales Forecast</h2>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Forecast Period:</label>
          <select
            value={periods}
            onChange={(e) => setPeriods(Number(e.target.value))}
            className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </select>
        </div>
      </div>

      {/* Forecast Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-blue-900">Forecast Summary</h3>
            <p className="mt-2 text-blue-700">
              Method: <span className="font-medium">{method}</span> | 
              Confidence Level: <span className="font-medium">{confidence_level}%</span>
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {forecast.slice(0, 3).map((period, index) => (
                <div key={index} className="bg-white rounded p-4">
                  <p className="text-sm text-gray-600">
                    {new Date(period.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                    }).format(period.value)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Range: {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(period.confidence_lower)} - {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(period.confidence_upper)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Historical vs Forecast</h3>
        <TrendChart
          data={chartData}
          type="line"
          dataKeys={[
            { dataKey: 'value', name: 'Historical Revenue' },
            { dataKey: 'forecast_value', name: 'Forecast Revenue' }
          ]}
          xDataKey="date"
          formatYAxis="currency"
          height={400}
          colors={['#3B82F6', '#10B981']}
        />
      </div>

      {/* Forecast Details Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Forecast Details</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Forecast Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lower Bound (90%)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Upper Bound (90%)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {forecast.map((period, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(period.date).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(period.value)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(period.confidence_lower)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(period.confidence_upper)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="ml-3">
            <p className="text-sm text-amber-700">
              <span className="font-medium">Note:</span> This forecast is based on historical trends using a {method} model. 
              Actual results may vary due to market conditions, seasonality, and other external factors not captured in the model.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Forecast;