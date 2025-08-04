import React, { useState, useEffect, useRef } from 'react';
import { LLMService } from './llmService';
import { getFunctionDescriptions, retrievalFunctions } from './retrievalFunctions';
import explicitMemory from './data/explicitProductAssumptionMemory.json';
import precomputedStats from './data/precomputedStatistics.json';
import entityMappings from './data/entityMappings.json';

function App() {
  const [llmService, setLlmService] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('scenarios');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [pendingTypos, setPendingTypos] = useState(null);
  const isProcessingRef = useRef(false);
  const showDebug = true; // Always show debug info

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
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    // Prevent duplicate submissions
    if (!query || !llmService || loading || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setLoading(true);
    setResponse(null);

    try {
      const result = await llmService.processQuery(query, showDebug, pendingTypos);
      
      if (result.needsConfirmation) {
        // Store the pending typos and show confirmation dialog
        setPendingTypos(result.possibleTypos);
        setResponse(result);
      } else {
        // Normal response
        setResponse(result);
        setPendingTypos(null);
      }
    } catch (error) {
      setResponse({
        success: false,
        error: error.message,
        response: `오류가 발생했습니다: ${error.message}`
      });
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const selectScenario = (scenario) => {
    setSelectedScenario(scenario);
    setQuery(scenario.exampleQuery);
    setActiveTab('query');
  };

  const scenarios = llmService?.getScenarioExamples() || [];
  const functionDescriptions = getFunctionDescriptions();
  
  // Toggle expanded state
  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleTypoConfirmation = (confirmed) => {
    if (confirmed && pendingTypos) {
      // Mark all typos as confirmed
      const confirmedTypos = pendingTypos.map(typo => ({
        ...typo,
        confirmed: true
      }));
      
      // Resubmit with confirmed typos
      setPendingTypos(confirmedTypos);
      handleQuerySubmit();
    } else {
      // User rejected the suggestions, proceed with original terms
      setPendingTypos([]);
      handleQuerySubmit();
    }
  };

  if (!llmService) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">명시적기억 DB와 사전계산통계 DB를 이용한 LLM + Retrieval 실험 플랫폼 </h1>
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">명시적기억 DB와 사전계산통계 DB를 이용한 LLM + Retrieval 실험 플랫폼</h1>
          <div className="flex gap-2 sm:gap-4 flex-shrink-0">
            <a 
              href="https://chrischangminlee.github.io/Enterprise-AI-Platform/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-gray-600 hover:text-gray-900 text-xs sm:text-sm whitespace-nowrap"
            >
              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="hidden sm:inline">기업 AI 정보 플랫폼</span>
              <span className="sm:hidden">AI 플랫폼</span>
            </a>
            <a 
              href="https://www.linkedin.com/in/chrislee9407/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-gray-600 hover:text-gray-900 text-xs sm:text-sm whitespace-nowrap"
            >
              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              <span className="hidden sm:inline">개발자 링크드인</span>
              <span className="sm:hidden">LinkedIn</span>
            </a>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
          <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 min-w-max">
            <button
              onClick={() => setActiveTab('experiment')}
              className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'experiment'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              실험 내용
            </button>
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'scenarios'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              시나리오
            </button>
            <button
              onClick={() => setActiveTab('query')}
              className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'query'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              질의하기
            </button>
            <button
              onClick={() => setActiveTab('functions')}
              className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'functions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              시스템 함수
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'data'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              데이터 구조
            </button>
            <button
              onClick={() => setActiveTab('mappings')}
              className={`py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'mappings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              엔티티 매핑
            </button>
          </nav>
        </div>

        {/* Scenarios Tab */}
        {activeTab === 'scenarios' && (
          <div>
            <p className="text-gray-900 mb-6 text-center text-lg font-medium">
              아래 3개의 시나리오 중 하나를 선택하여 기업 데이터 정보 조회를 테스트해보세요
            </p>
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
          </div>
        )}

        {/* Query Tab */}
        {activeTab === 'query' && (
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleQuerySubmit} className="mb-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-gray-700 font-medium">질문 입력:</span>
                    <span className="text-sm text-gray-500">
                      데이터 구조를 참고해서 유사한 질문을 해보세요
                    </span>
                  </div>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !loading) {
                        e.preventDefault();
                        handleQuerySubmit();
                      }
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm h-24"
                    placeholder="예: 갑상선암 발생률이 변경되면 어떤 상품들이 영향을 받나요?"
                  />
                </div>
                <div className="flex items-center justify-end">
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
                {/* Typo Confirmation Dialog */}
                {response.needsConfirmation && (
                  <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-4 text-yellow-800">용어 확인 필요</h3>
                    <div className="mb-4">
                      <pre className="whitespace-pre-wrap text-sm">{response.response}</pre>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleTypoConfirmation(true)}
                        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                      >
                        확인 (제안된 용어로 진행)
                      </button>
                      <button
                        onClick={() => handleTypoConfirmation(false)}
                        className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                      >
                        취소 (원래 입력대로 진행)
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Main Response */}
                {!response.needsConfirmation && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-4">응답</h3>
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap text-sm">{response.response}</pre>
                    </div>
                  </div>
                )}

                {/* Debug Information */}
                {response.debug && !response.needsConfirmation && (
                  <div className="bg-gray-100 p-6 rounded-lg">
                    <h3 className="font-bold text-lg mb-4">디버그 정보</h3>
                    
                    <div className="space-y-4">
                      {response.debug.extractedEntities && (
                        <div>
                          <h4 className="font-medium mb-2">1. 추출된 엔티티:</h4>
                          <pre className="bg-white p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(response.debug.extractedEntities, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {response.debug.resolvedEntities && (
                        <div>
                          <h4 className="font-medium mb-2">2. 매칭된 엔티티:</h4>
                          <pre className="bg-white p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(response.debug.resolvedEntities, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-medium mb-2">3. 쿼리 이해:</h4>
                        <pre className="bg-white p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(response.debug.understanding, null, 2)}
                        </pre>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">4. 사용된 함수:</h4>
                        <div className="flex flex-wrap gap-2">
                          {response.debug.functionsUsed.map((func, idx) => (
                            <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                              {func}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">5. 검색 결과:</h4>
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
                  <div key={func.name}>
                    <div 
                      className="border-l-4 border-blue-500 pl-4 cursor-pointer hover:bg-gray-50 py-2"
                      onClick={() => toggleExpanded(`func-${func.name}`)}
                    >
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
                    {expandedItems.has(`func-${func.name}`) && (
                      <div className="ml-4 mt-2 p-4 bg-gray-50 rounded border-l-4 border-gray-300">
                        <h4 className="font-mono font-bold text-sm mb-2">전체 함수 정의:</h4>
                        <pre className="bg-white p-3 rounded overflow-x-auto text-xs border">
                          {JSON.stringify({
                            name: retrievalFunctions[func.name]?.name,
                            description: retrievalFunctions[func.name]?.description,
                            requiredKeys: retrievalFunctions[func.name]?.requiredKeys,
                            optionalKeys: retrievalFunctions[func.name]?.optionalKeys,
                            dataSource: retrievalFunctions[func.name]?.dataSource,
                            execute: retrievalFunctions[func.name]?.execute?.toString()
                          }, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Explicit Memory Structure</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">가정(Assumption) 매핑:</h3>
                    <div className="text-sm space-y-1">
                      {Object.entries(explicitMemory.assumptionProductMappings).map(([code, data]) => (
                        <div key={code}>
                          <div className="flex items-center">
                            <code 
                              className="bg-gray-100 px-2 py-1 rounded mr-2 cursor-pointer hover:bg-blue-100"
                              onClick={() => toggleExpanded(`assumption-${code}`)}
                            >
                              {code}
                            </code>
                            <span>{data.assumptionName}</span>
                            <span className="text-gray-500 ml-2">
                              ({data.affectedProducts.length} 상품)
                            </span>
                          </div>
                          {expandedItems.has(`assumption-${code}`) && (
                            <div className="ml-4 mt-2 p-3 bg-gray-50 rounded text-xs">
                              <pre className="overflow-x-auto">
                                {JSON.stringify(data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">상품(Product) 프로필:</h3>
                    <div className="text-sm space-y-1">
                      {Object.entries(explicitMemory.productAssumptionProfiles).map(([code, data]) => (
                        <div key={code}>
                          <div className="flex items-center">
                            <code 
                              className="bg-gray-100 px-2 py-1 rounded mr-2 cursor-pointer hover:bg-blue-100"
                              onClick={() => toggleExpanded(`product-profile-${code}`)}
                            >
                              {code}
                            </code>
                            <span>{data.productName}</span>
                            <span className="text-gray-500 ml-2">
                              ({data.assumptions.length} 가정)
                            </span>
                          </div>
                          {expandedItems.has(`product-profile-${code}`) && (
                            <div className="ml-4 mt-2 p-3 bg-gray-50 rounded text-xs">
                              <pre className="overflow-x-auto">
                                {JSON.stringify(data, null, 2)}
                              </pre>
                            </div>
                          )}
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
                        <div key={code}>
                          <div className="flex items-center">
                            <code 
                              className="bg-gray-100 px-2 py-1 rounded mr-2 cursor-pointer hover:bg-blue-100"
                              onClick={() => toggleExpanded(`product-stats-${code}`)}
                            >
                              {code}
                            </code>
                            <span>{data.productName}</span>
                            <span className="text-gray-500 ml-2">
                              ({Object.keys(data.yearlyData).join(', ')})
                            </span>
                          </div>
                          {expandedItems.has(`product-stats-${code}`) && (
                            <div className="ml-4 mt-2 p-3 bg-gray-50 rounded text-xs">
                              <pre className="overflow-x-auto">
                                {JSON.stringify(data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">집계 데이터:</h3>
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="font-medium">연도별:</span>{' '}
                        {Object.keys(precomputedStats.aggregatedMetrics.byYear).map(year => (
                          <span key={year}>
                            <span 
                              className="inline-block bg-gray-100 px-2 py-1 rounded mr-1 cursor-pointer hover:bg-blue-100"
                              onClick={() => toggleExpanded(`aggregated-year-${year}`)}
                            >
                              {year}
                            </span>
                            {expandedItems.has(`aggregated-year-${year}`) && (
                              <div className="mt-2 mb-2 p-3 bg-gray-50 rounded text-xs">
                                <pre className="overflow-x-auto">
                                  {JSON.stringify(precomputedStats.aggregatedMetrics.byYear[year], null, 2)}
                                </pre>
                              </div>
                            )}
                          </span>
                        ))}
                      </div>
                      <div>
                        <span className="font-medium">카테고리별:</span>{' '}
                        {Object.keys(precomputedStats.aggregatedMetrics.byProductCategory).map(category => (
                          <span key={category}>
                            <span 
                              className="inline-block bg-gray-100 px-2 py-1 rounded mr-1 cursor-pointer hover:bg-blue-100"
                              onClick={() => toggleExpanded(`aggregated-category-${category}`)}
                            >
                              {category}
                            </span>
                            {expandedItems.has(`aggregated-category-${category}`) && (
                              <div className="mt-2 mb-2 p-3 bg-gray-50 rounded text-xs">
                                <pre className="overflow-x-auto">
                                  {JSON.stringify(precomputedStats.aggregatedMetrics.byProductCategory[category], null, 2)}
                                </pre>
                              </div>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mappings Tab */}
        {activeTab === 'mappings' && (
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Assumptions Mappings */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">가정(Assumption) 매핑</h2>
                <div className="space-y-3">
                  {Object.entries(entityMappings.assumptions).map(([code, mapping]) => (
                    <div key={code}>
                      <div 
                        className="cursor-pointer hover:bg-gray-50 p-2 rounded"
                        onClick={() => toggleExpanded(`mapping-assumption-${code}`)}
                      >
                        <div className="flex items-start">
                          <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono mr-3">
                            {code}
                          </code>
                          <div className="flex-1">
                            <div className="font-medium">{mapping.primaryName}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {mapping.aliases.slice(0, 3).join(', ')}
                              {mapping.aliases.length > 3 && ` 외 ${mapping.aliases.length - 3}개`}
                            </div>
                          </div>
                        </div>
                      </div>
                      {expandedItems.has(`mapping-assumption-${code}`) && (
                        <div className="ml-4 mt-2 p-3 bg-gray-50 rounded text-sm">
                          <div className="mb-2">
                            <span className="font-medium">카테고리:</span> {mapping.category}
                          </div>
                          <div className="mb-2">
                            <span className="font-medium">설명:</span> {mapping.description}
                          </div>
                          <div>
                            <span className="font-medium">모든 별칭:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {mapping.aliases.map((alias, idx) => (
                                <span key={idx} className="bg-gray-200 px-2 py-1 rounded text-xs">
                                  {alias}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Products Mappings */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">상품(Product) 매핑</h2>
                <div className="space-y-3">
                  {Object.entries(entityMappings.products).map(([code, mapping]) => (
                    <div key={code}>
                      <div 
                        className="cursor-pointer hover:bg-gray-50 p-2 rounded"
                        onClick={() => toggleExpanded(`mapping-product-${code}`)}
                      >
                        <div className="flex items-start">
                          <code className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-mono mr-3">
                            {code}
                          </code>
                          <div className="flex-1">
                            <div className="font-medium">{mapping.primaryName}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {mapping.aliases.slice(0, 3).join(', ')}
                              {mapping.aliases.length > 3 && ` 외 ${mapping.aliases.length - 3}개`}
                            </div>
                          </div>
                        </div>
                      </div>
                      {expandedItems.has(`mapping-product-${code}`) && (
                        <div className="ml-4 mt-2 p-3 bg-gray-50 rounded text-sm">
                          <div className="mb-2">
                            <span className="font-medium">카테고리:</span> {mapping.category}
                          </div>
                          <div className="mb-2">
                            <span className="font-medium">출시일:</span> {mapping.launchDate}
                          </div>
                          <div>
                            <span className="font-medium">모든 별칭:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {mapping.aliases.map((alias, idx) => (
                                <span key={idx} className="bg-gray-200 px-2 py-1 rounded text-xs">
                                  {alias}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Categories Section */}
            <div className="mt-6 bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">카테고리(Category) 매핑</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(entityMappings.categories).map(([code, mapping]) => (
                  <div key={code}>
                    <div 
                      className="cursor-pointer hover:bg-gray-50 p-3 rounded border border-gray-200"
                      onClick={() => toggleExpanded(`mapping-category-${code}`)}
                    >
                      <div className="flex items-start">
                        <code className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-mono mr-3">
                          {code}
                        </code>
                        <div className="flex-1">
                          <div className="font-medium">{mapping.primaryName}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            포함 상품: {mapping.products.join(', ')}
                          </div>
                        </div>
                      </div>
                      {expandedItems.has(`mapping-category-${code}`) && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm">
                            <span className="font-medium">모든 별칭:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {mapping.aliases.map((alias, idx) => (
                                <span key={idx} className="bg-gray-200 px-2 py-1 rounded text-xs">
                                  {alias}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Experiment Tab */}
        {activeTab === 'experiment' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow">
              <div className="flex justify-between items-start mb-6">
                <h1 className="text-2xl font-bold">
                  명시적 기억과 사전계산 통계를 이용한 보험 기업 생성형 AI 활용 방안 Test
                </h1>
                <a 
                  href="https://changminiai.tistory.com/entry/%EA%B8%B0%EC%97%85-AI-%EB%8F%84%EC%9E%85-%EA%B0%80%EC%9D%B4%EB%93%9C-Enterprise-AI-AI-Agent%EB%A5%BC-%EC%9C%84%ED%95%9C-ERP-%EA%B5%AC%EC%A1%B0-%EB%AA%85%EC%8B%9C%EC%A0%81-%EA%B8%B0%EC%96%B5-Explicit-Memory%EA%B3%BC-%EC%82%AC%EC%A0%84-%EA%B3%84%EC%82%B0-%ED%86%B5%EA%B3%84Precomputed-Statistics-%EB%B3%B4%ED%97%98-%EC%83%81%ED%92%88%EA%B0%9C%EB%B0%9C-%EB%B3%B4%ED%97%98-%EA%B3%84%EB%A6%AC-AI-ERP-%EC%98%88%EC%8B%9C"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  관련블로그
                </a>
              </div>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-blue-600">테스트 목적:</h2>
                <p className="text-gray-700 leading-relaxed">
                  자연어 질의를 통해 보험 상품 데이터를 검색하는 LLM + Retrieval Function 파이프라인 검증
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-blue-600">시스템 처리 단계:</h2>
                <ol className="space-y-4">
                  <li className="flex">
                    <span className="font-bold text-blue-500 mr-3">1.</span>
                    <div>
                      <strong>사용자 질의 입력</strong>
                      <p className="text-gray-600 text-sm mt-1">
                        (예: "갑상선암 발생률이 변경되면 어떤 상품들이 영향을 받나요?")
                      </p>
                    </div>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-blue-500 mr-3">2.</span>
                    <div>
                      <strong>LLM 질의 분석</strong> - Gemini API가 질문을 분석하여:
                      <ul className="list-disc list-inside mt-2 ml-4 text-gray-600">
                        <li>사용자 의도 파악</li>
                        <li>명시적 기억 또는 사전계산 통계 중 적절한 데이터 소스 결정</li>
                        <li>필요한 Retrieval Function 선택</li>
                        <li>필요 Retrieval Function이 요구하는 파라미터 추출 (한국어(갑상선암) → 시스템 코드 (C51) 변환)</li>
                      </ul>
                    </div>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-blue-500 mr-3">3.</span>
                    <div>
                      <strong>Retrieval Function 실행</strong>
                      <ul className="list-disc list-inside mt-2 ml-4 text-gray-600">
                        <li>명시적 기억: 상품-가정 관계 데이터 즉시 조회. 참고해야할 DB를 찾을 수 있게 방향성을 제시합니다.</li>
                        <li>사전계산 통계: 연도별/상품별 집계 데이터 바로 반환. AI가 통계적인 답변을 추론하는 대신, 검증된 값을 직접 참조하게 하여 답변의 속도와 정확성을 극대화합니다.</li>
                      </ul>
                    </div>
                  </li>
                  <li className="flex">
                    <span className="font-bold text-blue-500 mr-3">4.</span>
                    <div>
                      <strong>LLM 응답 생성</strong> - 검색 결과를 자연스러운 한국어로 변환
                    </div>
                  </li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-blue-600">데이터 구조:</h2>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">명시적 기억 (Explicit Memory):</h3>
                    <p className="text-gray-700">
                      보험 상품과 계리 가정 간의 관계를 명시적으로 저장하여 맥락전달.  
                      AI가 방대한 데이터의 바다를 항해하는 대신 참고해야할 DB를 찾을 수 있게 방향성을 제시합니다.
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">사전계산 통계 (Precomputed Statistics):</h3>
                    <p className="text-gray-700">
                      방대한 보험 데이터를 미리 연도별/상품별로 집계하여, 
                      AI가 통계적인 답변을 추론하는 대신, 검증된 값을 직접 참조하게 하여 답변의 속도와 정확성을 극대화합니다.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3 text-blue-600">주요 테스트 항목:</h2>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <div>
                      <strong>자연어 → 파라미터 변환:</strong>
                      <p className="text-gray-600 text-sm mt-1">
                        사용자의 한국어 질문을 시스템 코드(C51, PROD-001 등)로 정확히 매핑하는지 확인
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <div>
                      <strong>Retrieval Function 선택 정확도:</strong>
                      <p className="text-gray-600 text-sm mt-1">
                        LLM이 질문 의도를 파악하여 올바른 검색 함수를 선택하는지 검증
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <div>
                      <strong>데이터 검색 및 응답 생성:</strong>
                      <p className="text-gray-600 text-sm mt-1">
                        검색된 데이터를 자연스러운 한국어로 변환하여 답변하는지 평가
                      </p>
                    </div>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3 text-blue-600">테스트 시나리오:</h2>
                <div className="space-y-3">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <strong>1. 가정(assumption) 변경 시 영향받는 상품 조회</strong>
                    <p className="text-gray-600 text-sm">(명시적 기억 활용)</p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <strong>2. 연도별 상품 수익성 분석</strong>
                    <p className="text-gray-600 text-sm">(사전계산 통계 활용)</p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <strong>3. 상품별 보험료 통계 추이 확인</strong>
                    <p className="text-gray-600 text-sm">(사전계산 통계 활용)</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;