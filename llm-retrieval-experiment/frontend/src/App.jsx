import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [executeInParallel, setExecuteInParallel] = useState(false);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const response = await axios.get('/api/test-scenarios');
      setScenarios(response.data.scenarios);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/chat', {
        question,
        executeInParallel
      });
      setResults(response.data);
    } catch (error) {
      console.error('Error submitting question:', error);
      alert('Error processing request');
    } finally {
      setLoading(false);
    }
  };

  const selectScenario = (scenario) => {
    setQuestion(scenario.question);
  };

  const formatResults = (data) => {
    if (!data) return null;

    if (data.parallelExecution) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">실행 1</h3>
            {formatSingleExecution(data.executions[0])}
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">실행 2</h3>
            {formatSingleExecution(data.executions[1])}
          </div>
        </div>
      );
    } else {
      return formatSingleExecution(data.execution);
    }
  };

  const formatSingleExecution = (execution) => {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-semibold mb-2">함수 선택</h4>
          <p className="text-sm mb-1">
            <span className="font-medium">선택된 함수:</span> {execution.functionSelection.selectedFunction}
          </p>
          <p className="text-sm mb-1">
            <span className="font-medium">카테고리:</span> {execution.executionPath.category}
          </p>
          <p className="text-sm">
            <span className="font-medium">이유:</span> {execution.functionSelection.reasoning}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded">
          <h4 className="font-semibold mb-2">검색 결과</h4>
          <p className="text-sm mb-1">
            <span className="font-medium">결과 수:</span> {execution.executionPath.resultCount}개
          </p>
          <p className="text-sm">
            <span className="font-medium">실행 시간:</span> {execution.executionTimeMs}ms
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded">
          <h4 className="font-semibold mb-2">LLM 응답</h4>
          <p className="text-sm whitespace-pre-wrap">{execution.response}</p>
        </div>

        <details className="bg-yellow-50 p-4 rounded">
          <summary className="cursor-pointer font-semibold">원시 데이터 보기</summary>
          <pre className="mt-2 text-xs overflow-x-auto">
            {JSON.stringify(execution.retrievalResult, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          LLM Retrieval 실험 플랫폼
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    질문 입력
                  </label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="질문을 입력하세요..."
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={executeInParallel}
                      onChange={(e) => setExecuteInParallel(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">병렬 실행 (일관성 테스트)</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? '처리 중...' : '질문 제출'}
                </button>
              </form>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">테스트 시나리오</h2>
              <div className="space-y-3">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                    onClick={() => selectScenario(scenario)}
                  >
                    <h3 className="font-medium text-sm">{scenario.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {scenario.question}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      예상 카테고리: {scenario.expectedCategory}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {results && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">실행 결과</h2>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm">
                <span className="font-medium">질문:</span> {results.question}
              </p>
              <p className="text-sm">
                <span className="font-medium">타임스탬프:</span> {results.timestamp}
              </p>
            </div>
            {formatResults(results)}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;