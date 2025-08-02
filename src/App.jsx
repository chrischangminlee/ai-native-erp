import React, { useState, useEffect } from 'react';
import { executeQuery } from './geminiService';
import { retrievalFunctions, getFunctionDescriptions } from './retrievalFunctions';
import explicitMemory from './data/explicitMemory.json';
import precomputedStats from './data/precomputedStatistics.json';

function App() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [executeInParallel, setExecuteInParallel] = useState(true);
  const [activeTab, setActiveTab] = useState('experiment'); // 'experiment' or 'system-info'

  // Debug: Check if data is loaded
  useEffect(() => {
    console.log('Explicit Memory data:', explicitMemory);
    console.log('Precomputed Stats data:', precomputedStats);
    console.log('Function descriptions:', getFunctionDescriptions());
  }, []);

  useEffect(() => {
    // Set test scenarios for V2
    setScenarios([
      {
        id: 'A',
        name: '가정 변경 영향도 분석',
        question: '갑상선암 발생률을 변경하면 어떤 상품들이 영향을 받나요?',
        expectedCategory: 'explicit_memory',
        description: '가정 변경시 영향받는 상품 파악'
      },
      {
        id: 'B',
        name: '재무 지표 필터링',
        question: '2024년 출시된 상품 중 IRR이 12% 이상인 상품을 보여주세요',
        expectedCategory: 'precomputed_statistics',
        description: '조건에 맞는 상품 검색'
      },
      {
        id: 'C',
        name: '상품 비교 분석',
        question: 'PROD001과 PROD002 상품의 2024년 실적을 비교해주세요',
        expectedCategory: 'precomputed_statistics',
        description: '여러 상품의 지표 비교'
      },
      {
        id: 'D',
        name: '연도별 실적 비교',
        question: '2023년 대비 2024년 실적이 어떻게 변했나요?',
        expectedCategory: 'precomputed_statistics',
        description: '연도별 성과 비교'
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
    // Handle V2 response format
    if (!execution.success) {
      return (
        <div className="bg-red-50 p-4 rounded">
          <h4 className="font-semibold mb-2">오류 발생</h4>
          {execution.needsMoreInfo ? (
            <div>
              <p className="text-sm mb-2">추가 정보가 필요합니다:</p>
              <ul className="list-disc list-inside text-sm">
                {execution.missingInfo?.map((info, idx) => (
                  <li key={idx}>{info}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm">{execution.error || execution.message || '처리 중 오류가 발생했습니다'}</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-semibold mb-2">함수 선택</h4>
          <p className="text-sm mb-1">
            <span className="font-medium">선택된 함수:</span> {execution.functionSelection?.selectedFunction}
          </p>
          <p className="text-sm mb-1">
            <span className="font-medium">파라미터:</span> {JSON.stringify(execution.functionSelection?.parameters)}
          </p>
          <p className="text-sm">
            <span className="font-medium">이유:</span> {execution.functionSelection?.reasoning}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded">
          <h4 className="font-semibold mb-2">검색 결과</h4>
          <p className="text-sm mb-1">
            <span className="font-medium">쿼리 타입:</span> {execution.retrievalResult?.queryType}
          </p>
          <p className="text-sm mb-1">
            <span className="font-medium">결과 수:</span> {execution.retrievalResult?.resultCount || execution.executionPath?.resultCount}개
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
        {/* Tab Content */}
        {activeTab === 'experiment' ? (
          <>
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
                    className="w-full p-3 border border-gray-400 rounded-lg bg-gray-200 cursor-not-allowed text-gray-600"
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
            
            {results && (
              <div className="bg-white rounded-lg shadow p-6 mt-6">
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

          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">테스트 시나리오</h2>
              <p className="text-xs text-gray-600 mb-3">
                💡 시스템은 이 예시 외에도 다양한 질문을 처리할 수 있습니다
              </p>
              <div className="space-y-3">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className={`p-3 rounded cursor-pointer ${
                      scenario.expectedCategory === 'explicit_memory' 
                        ? 'bg-green-50 hover:bg-green-100' 
                        : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                    onClick={() => selectScenario(scenario)}
                  >
                    <h3 className="font-medium text-sm">{scenario.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {scenario.question}
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
              <h3 className="text-lg font-medium mb-3">검색 함수 ({getFunctionDescriptions().length}개)</h3>
              <div className="bg-gray-50 p-4 rounded">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Explicit Memory 함수</p>
                    <div className="text-xs text-gray-700 ml-2 mt-1 space-y-2">
                      {getFunctionDescriptions().filter(f => f.category === 'explicit_memory').map(f => (
                        <div key={f.name} className="border-l-2 border-blue-200 pl-2">
                          <p className="font-medium">{f.name}</p>
                          <p className="text-gray-600">{f.description}</p>
                          <div className="text-xs text-gray-500 mt-1">
                            필수: {f.requiredParams.join(', ') || '없음'}<br/>
                            선택: {f.optionalParams.join(', ') || '없음'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-green-600">Statistics 함수</p>
                    <div className="text-xs text-gray-700 ml-2 mt-1 space-y-2">
                      {getFunctionDescriptions().filter(f => f.category === 'precomputed_statistics').map(f => (
                        <div key={f.name} className="border-l-2 border-green-200 pl-2">
                          <p className="font-medium">{f.name}</p>
                          <p className="text-gray-600">{f.description}</p>
                          <div className="text-xs text-gray-500 mt-1">
                            필수: {f.requiredParams.join(', ') || '없음'}<br/>
                            선택: {f.optionalParams.join(', ') || '없음'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Explicit Memory 데이터</h3>
              <div className="bg-blue-50 p-4 rounded space-y-3">
                <p className="text-xs font-medium">관계형 컨텍스트 정보:</p>
                
                <div className="bg-white/50 p-3 rounded space-y-2">
                  <div className="flex items-start">
                    <div className="text-blue-600 mr-2">📊</div>
                    <div className="w-full">
                      <p className="text-xs font-medium">상품-가정 연결 관계</p>
                      <p className="text-xs text-gray-600">상품 {explicitMemory?.productAssumptionConnections?.length || 0}개가 가정과 연결</p>
                      <p className="text-xs text-gray-500">→ 가정 변경 시 영향 범위 즉시 파악</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="text-blue-600 mr-2">📝</div>
                    <div className="w-full">
                      <p className="text-xs font-medium">설계 변경 이력</p>
                      <p className="text-xs text-gray-600">각 상품의 변경 내역과 담당자 추적</p>
                      <p className="text-xs text-gray-500">→ 의사결정 과정 투명성 확보</p>
                    </div>
                  </div>
                </div>
                
                {/* 실제 관계 데이터 예시 */}
                <div className="bg-blue-100/50 p-2 rounded max-h-48 overflow-y-auto">
                  <p className="text-xs font-medium mb-1">전체 상품-가정 연결 데이터:</p>
                  <div className="space-y-1 text-xs">
                    {explicitMemory?.productAssumptionConnections?.map((product, idx) => (
                      <div key={idx} className="bg-white/70 p-1 rounded">
                        <p className="font-medium">{product.productName}</p>
                        <p className="text-gray-600">연결된 가정: {product.assumptions.map(a => a.assumptionName).join(', ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t border-blue-200 pt-2">
                  <p className="text-xs text-blue-700 font-medium">
                    💡 핵심 가치: "What-if" 분석을 위한 관계 네트워크
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Precomputed Statistics</h3>
              <div className="bg-green-50 p-4 rounded space-y-3">
                <p className="text-xs font-medium">사전 계산된 비즈니스 지표:</p>
                
                <div className="bg-white/50 p-3 rounded space-y-2">
                  <div className="flex items-start">
                    <div className="text-green-600 mr-2">💰</div>
                    <div className="w-full">
                      <p className="text-xs font-medium">재무 성과 지표</p>
                      <p className="text-xs text-gray-600">IRR, 수익률, 손해율 등 핵심 KPI</p>
                      <p className="text-xs text-gray-500">→ 수익성 평가 및 투자 결정</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="text-green-600 mr-2">📈</div>
                    <div className="w-full">
                      <p className="text-xs font-medium">보험료 통계</p>
                      <p className="text-xs text-gray-600">2024년 {precomputedStats?.productStatistics?.['2024'] ? 
                        (precomputedStats.productStatistics['2024'].thyroidCancerProducts.length + 
                         precomputedStats.productStatistics['2024'].allHealthProducts.length) : 0}개 상품 분석</p>
                      <p className="text-xs text-gray-500">→ 가격 경쟁력 및 시장 포지셔닝</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="text-green-600 mr-2">⚠️</div>
                    <div className="w-full">
                      <p className="text-xs font-medium">리스크 지표</p>
                      <p className="text-xs text-gray-600">클레임 빈도, 평균 지급액 통계</p>
                      <p className="text-xs text-gray-500">→ 리스크 관리 및 준비금 설정</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="text-green-600 mr-2">📊</div>
                    <div className="w-full">
                      <p className="text-xs font-medium">시장 점유율 데이터</p>
                      <p className="text-xs text-gray-600">연도별, 상품유형별 집계 통계</p>
                      <p className="text-xs text-gray-500">→ 전략적 시장 확대 계획 수립</p>
                    </div>
                  </div>
                </div>
                
                {/* 실제 통계 데이터 예시 */}
                <div className="bg-green-100/50 p-2 rounded max-h-48 overflow-y-auto">
                  <p className="text-xs font-medium mb-1">전체 상품 통계 데이터 (2024년):</p>
                  <div className="space-y-1 text-xs">
                    {precomputedStats?.productStatistics?.['2024'] && (
                      <>
                        {/* 갑상선암 상품 */}
                        {precomputedStats.productStatistics['2024'].thyroidCancerProducts?.map((product, idx) => (
                          <div key={`thyroid-${idx}`} className="bg-white/70 p-1 rounded">
                            <p className="font-medium">{product.productName}</p>
                            <div className="grid grid-cols-2 gap-1 text-gray-600">
                              <span>평균 보험료: {(product.premiumStats.averageMonthlyPremium / 1000).toFixed(0)}천원</span>
                              <span>IRR: {(product.financialMetrics.IRR * 100).toFixed(1)}%</span>
                              <span>손해율: {(product.financialMetrics.lossRatio * 100).toFixed(0)}%</span>
                              <span>계약수: {product.contractStats.totalContracts.toLocaleString()}건</span>
                            </div>
                          </div>
                        ))}
                        {/* 일반 건강보험 상품 */}
                        {precomputedStats.productStatistics['2024'].allHealthProducts?.map((product, idx) => (
                          <div key={`health-${idx}`} className="bg-white/70 p-1 rounded">
                            <p className="font-medium">{product.productName}</p>
                            <div className="grid grid-cols-2 gap-1 text-gray-600">
                              <span>평균 보험료: {(product.premiumStats.averageMonthlyPremium / 1000).toFixed(0)}천원</span>
                              <span>IRR: {(product.financialMetrics.IRR * 100).toFixed(1)}%</span>
                              <span>손해율: {(product.financialMetrics.lossRatio * 100).toFixed(0)}%</span>
                              <span>계약수: {product.contractStats.totalContracts.toLocaleString()}건</span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-green-200 pt-2">
                  <p className="text-xs text-green-700 font-medium">
                    💡 핵심 가치: 신속한 의사결정을 위한 검증된 지표
                  </p>
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