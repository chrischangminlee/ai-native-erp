import { AlertCircle, RefreshCw } from 'lucide-react';

function ErrorMessage({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">오류</h3>
          <p className="mt-1 text-sm text-red-700">
            {message || '데이터를 불러오는 중 오류가 발생했습니다.'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              다시 시도
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorMessage;