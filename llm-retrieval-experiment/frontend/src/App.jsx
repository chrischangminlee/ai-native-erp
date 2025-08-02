import React, { useState, useEffect } from 'react';
import { executeQuery } from './geminiService';
import { getFunctionDescriptions } from './retrievalFunctions';
import explicitMemory from './data/explicitMemory.json';
import precomputedStats from './data/precomputedStatistics.json';

function App() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [executeInParallel, setExecuteInParallel] = useState(false);
  const [activeTab, setActiveTab] = useState('experiment'); // 'experiment' or 'system-info'

  useEffect(() => {
    // Set test scenarios
    setScenarios([
      {
        id: 'A',
        name: 'Explicit Memory 기반 질문',
        question: '갑상선암 발생률을 바꾸면 영향을 받는 상품은?',
        expectedCategory: 'explicit_memory',
        description: '상품과 가정의 연결 관계를 탐색해야 하는 질문'
      },
      {
        id: 'B',
        name: 'Precomputed Statistics 기반 질문',
        question: '2024년 판매 갑상선암 상품들의 보험료 통계는?',
        expectedCategory: 'precomputed_statistics',
        description: '사전 계산된 통계를 조회해야 하는 질문'
      }
    ]);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    try {
      if (executeInParallel) {
        const [execution1, execution2] = await Promise.all([
          executeQuery(question),
          executeQuery(question)
        ]);
        
        setResults({
          question,
          parallelExecution: true,
          executions: [execution1, execution2],
          timestamp: new Date().toISOString()
        });
      } else {
        const result = await executeQuery(question);
        setResults({
          question,
          parallelExecution: false,
          execution: result,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error processing question:', error);
      let errorMessage = 'Error processing request';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.message?.includes('API key')) {
        errorMessage = 'Gemini API key is missing or invalid. Please check your .env file.';
      } else if (error.message?.includes('429')) {
        errorMessage = 'API rate limit exceeded. Please try again later.';
      } else if (error.message?.includes('403')) {
        errorMessage = 'API key is invalid or does not have permission. Please check your Gemini API key.';
      }
      
      alert(errorMessage);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-hidden">
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
      return <div className="max-h-[450px]">{formatSingleExecution(data.execution)}</div>;
    }
  };

  const formatSingleExecution = (execution) => {
    return (
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
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
          <pre className="mt-2 text-xs overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(execution.retrievalResult, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* GNB */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            <h1 className="text-xl font-bold mr-8">
              LLM Retrieval 실험 플랫폼
            </h1>
            
            {/* Tab Navigation in GNB */}
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('experiment')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'experiment'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                실험 플랫폼
              </button>
              <button
                onClick={() => setActiveTab('system-info')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'system-info'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                시스템 보유 정보검색 함수 & 데이터
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-sm">
            <strong>Gemini AI 모드:</strong> Google Gemini AI를 사용하여 실제 LLM 기반 함수 선택 및 응답을 생성합니다.
            {(!import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY === 'your_gemini_api_key_here') && 
              <span className="text-red-600 block mt-1">⚠️ Gemini API 키가 설정되지 않았습니다.</span>
            }
            {import.meta.env.DEV && import.meta.env.VITE_GEMINI_API_KEY && (
              <span className="text-green-600 block mt-1 text-xs">
                ✓ API Key loaded (Dev mode): {import.meta.env.VITE_GEMINI_API_KEY.substring(0, 10)}...
              </span>
            )}
          </p>
        </div>

        {/* Tab Content */}
        {activeTab === 'experiment' ? (
          <>
            {results && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    프롬프트 입력
                  </label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                    rows="3"
                    placeholder="데모를 위한 우측 2개의 테스트 시나리오 중 1개를 클릭하세요."
                    disabled
                    readOnly
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
                    <span className="text-sm">&lt;&lt; 같은 프롬프트를 2회 실행하여 결과 일관성 테스트</span>
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
          </>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">시스템 보유 정보검색 함수 & 데이터</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">검색 함수 (10개)</h3>
              <div className="bg-gray-50 p-4 rounded">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Explicit Memory 함수 (6개)</p>
                    <ul className="text-xs text-gray-700 ml-4 mt-1">
                      <li>• findProductsByAssumption</li>
                      <li>• getProductDesignHistory</li>
                      <li>• getAssumptionRelationships</li>
                      <li>• searchProductByKeyword</li>
                    </ul>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-green-600">Statistics 함수 (6개)</p>
                    <ul className="text-xs text-gray-700 ml-4 mt-1">
                      <li>• getProductPremiumStatistics</li>
                      <li>• getFinancialMetrics</li>
                      <li>• getRiskMetrics</li>
                      <li>• getContractStatistics</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Explicit Memory 데이터</h3>
              <div className="bg-blue-50 p-4 rounded">
                <p className="text-xs font-medium mb-2">관계형 컨텍스트 정보:</p>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• 상품 수: {explicitMemory.productAssumptionConnections.length}개</li>
                  <li>• 가정 관계: {explicitMemory.assumptionRelationships.length}개</li>
                  <li>• 주요 가정: 갑상선암 발생률, 사망률, 해약률</li>
                  <li>• 설계 이력 추적 가능</li>
                </ul>
                <p className="text-xs text-gray-600 mt-2">
                  💡 가정 변경 시 영향받는 상품 파악
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Precomputed Statistics</h3>
              <div className="bg-green-50 p-4 rounded">
                <p className="text-xs font-medium mb-2">사전 계산된 비즈니스 지표:</p>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• 2024년 상품: {precomputedStats.productStatistics['2024'].thyroidCancerProducts.length + precomputedStats.productStatistics['2024'].allHealthProducts.length}개</li>
                  <li>• 재무 지표: IRR, 수익률, 손해율</li>
                  <li>• 보험료 통계: 평균, 최소, 최대</li>
                  <li>• 리스크 지표: 클레임 빈도/금액</li>
                </ul>
                <p className="text-xs text-gray-600 mt-2">
                  💡 즉각적인 비즈니스 의사결정 지원
                </p>
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