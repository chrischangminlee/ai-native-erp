import { Calendar } from 'lucide-react';

function PeriodSelector({ value, onChange, options }) {
  const defaultOptions = [
    { value: 'current-month', label: '이번 달' },
    { value: 'last-month', label: '지난 달' },
    { value: 'last-3-months', label: '최근 3개월' },
    { value: 'last-6-months', label: '최근 6개월' },
    { value: 'last-12-months', label: '최근 12개월' },
  ];

  const periodOptions = options || defaultOptions;

  return (
    <div className="flex items-center space-x-2">
      <Calendar className="w-5 h-5 text-gray-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
      >
        {periodOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default PeriodSelector;