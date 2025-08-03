import React, { useState, useEffect } from 'react';
import { LLMService } from './llmService';
import { getFunctionDescriptions } from './retrievalFunctions';
import explicitMemory from './data/explicitProductAssumptionMemory.json';
import precomputedStats from './data/precomputedStatistics.json';

function App() {
  const [llmService, setLlmService] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('scenarios');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [showDebug, setShowDebug] = useState(true);

  useEffect(() => {
    // Check for API key in environment variable first (from Vercel)
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey) {
      setApiKey(envKey);
      setLlmService(new LLMService(envKey));
      return;
    }
    
    // Fall back to localStorage
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setLlmService(new LLMService(savedKey));
    }
  }, []);

  const handleApiKeySubmit = (e) => {
    e.preventDefault();
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
      setLlmService(new LLMService(apiKey));
    }
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!query || !llmService) return;

    setLoading(true);
    setResponse(null);

    try {
      const result = await llmService.processQuery(query, showDebug);
      setResponse(result);
    } catch (error) {
      setResponse({
        success: false,
        error: error.message,
        response: `오류가 발생했습니다: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const selectScenario = (scenario) => {
    setSelectedScenario(scenario);
    setQuery(scenario.exampleQuery);
    setActiveTab('query');
  };

  const scenarios = llmService?.getScenarioExamples() || [];
  const functionDescriptions = getFunctionDescriptions();

  if (!llmService) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">LLM Retrieval 실험 플랫폼 V4</h1>
          <form onSubmit={handleApiKeySubmit} className="bg-white p-6 rounded-lg shadow">
            <label className="block mb-4">
              <span className="text-gray-700">Gemini API Key:</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                placeholder="Enter your Gemini API key"
              />
            </label>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              시작하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">LLM Retrieval 실험 플랫폼 V4</h1>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scenarios'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              시나리오
            </button>
            <button
              onClick={() => setActiveTab('query')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'query'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              질의하기
            </button>
            <button
              onClick={() => setActiveTab('functions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'functions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              시스템 함수
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'data'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              데이터 구조
            </button>
          </nav>
        </div>

        {/* Scenarios Tab */}
        {activeTab === 'scenarios' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => selectScenario(scenario)}
              >
                <h3 className="font-bold text-lg mb-2">{scenario.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{scenario.description}</p>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-500">
                    <span className="font-medium">데이터 소스:</span> {scenario.dataSource}
                  </p>
                  <p className="text-gray-500">
                    <span className="font-medium">사용 함수:</span> {scenario.expectedFunction}
                  </p>
                  <p className="text-blue-600 font-medium">
                    예시: "{scenario.exampleQuery}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Query Tab */}
        {activeTab === 'query' && (
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleQuerySubmit} className="mb-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <label className="block mb-4">
                  <span className="text-gray-700 font-medium">질문 입력:</span>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm h-24"
                    placeholder="예: 갑상선암 발생률이 변경되면 어떤 상품들이 영향을 받나요?"
                  />
                </label>
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showDebug}
                      onChange={(e) => setShowDebug(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">디버그 정보 표시</span>
                  </label>
                  <button
                    type="submit"
                    disabled={loading || !query}
                    className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading ? '처리 중...' : '질의하기'}
                  </button>
                </div>
              </div>
            </form>

            {/* Response Display */}
            {response && (
              <div className="space-y-4">
                {/* Main Response */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="font-bold text-lg mb-4">응답</h3>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm">{response.response}</pre>
                  </div>
                </div>

                {/* Debug Information */}
                {response.debug && showDebug && (
                  <div className="bg-gray-100 p-6 rounded-lg">
                    <h3 className="font-bold text-lg mb-4">디버그 정보</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">쿼리 이해:</h4>
                        <pre className="bg-white p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(response.debug.understanding, null, 2)}
                        </pre>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">사용된 함수:</h4>
                        <div className="flex flex-wrap gap-2">
                          {response.debug.functionsUsed.map((func, idx) => (
                            <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                              {func}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">검색 결과:</h4>
                        <pre className="bg-white p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(response.debug.retrievalResults, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Functions Tab */}
        {activeTab === 'functions' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">시스템 검색 함수</h2>
              <div className="space-y-4">
                {functionDescriptions.map((func) => (
                  <div key={func.name} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-mono font-bold text-lg">{func.name}</h3>
                    <p className="text-gray-600 mb-2">{func.description}</p>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="font-medium">필수 키:</span>{' '}
                        <code className="bg-gray-100 px-2 py-1 rounded">
                          {func.requiredKeys.join(', ')}
                        </code>
                      </p>
                      {func.optionalKeys.length > 0 && (
                        <p>
                          <span className="font-medium">선택 키:</span>{' '}
                          <code className="bg-gray-100 px-2 py-1 rounded">
                            {func.optionalKeys.join(', ')}
                          </code>
                        </p>
                      )}
                      <p>
                        <span className="font-medium">데이터 소스:</span>{' '}
                        <span className="text-blue-600">{func.dataSource}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-2">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Explicit Memory Structure</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">가정(Assumption) 매핑:</h3>
                  <div className="text-sm space-y-1">
                    {Object.entries(explicitMemory.assumptionProductMappings).map(([code, data]) => (
                      <div key={code} className="flex items-center">
                        <code className="bg-gray-100 px-2 py-1 rounded mr-2">{code}</code>
                        <span>{data.assumptionName}</span>
                        <span className="text-gray-500 ml-2">
                          ({data.affectedProducts.length} 상품)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">상품(Product) 프로필:</h3>
                  <div className="text-sm space-y-1">
                    {Object.entries(explicitMemory.productAssumptionProfiles).map(([code, data]) => (
                      <div key={code} className="flex items-center">
                        <code className="bg-gray-100 px-2 py-1 rounded mr-2">{code}</code>
                        <span>{data.productName}</span>
                        <span className="text-gray-500 ml-2">
                          ({data.assumptions.length} 가정)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Precomputed Statistics Structure</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">상품별 연도 데이터:</h3>
                  <div className="text-sm space-y-1">
                    {Object.entries(precomputedStats.productYearlyMetrics).map(([code, data]) => (
                      <div key={code} className="flex items-center">
                        <code className="bg-gray-100 px-2 py-1 rounded mr-2">{code}</code>
                        <span>{data.productName}</span>
                        <span className="text-gray-500 ml-2">
                          ({Object.keys(data.yearlyData).join(', ')})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">집계 데이터:</h3>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="font-medium">연도별:</span>{' '}
                      {Object.keys(precomputedStats.aggregatedMetrics.byYear).join(', ')}
                    </div>
                    <div>
                      <span className="font-medium">카테고리별:</span>{' '}
                      {Object.keys(precomputedStats.aggregatedMetrics.byProductCategory).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;