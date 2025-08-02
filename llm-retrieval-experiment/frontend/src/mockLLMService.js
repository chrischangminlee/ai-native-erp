import { retrievalFunctions, getFunctionDescriptions } from './retrievalFunctions';

// Mock LLM function selector using keyword matching
export async function selectRetrievalFunction(userQuestion) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const question = userQuestion.toLowerCase();
  let selectedFunction = null;
  let parameters = {};
  let reasoning = '';

  // Keyword-based function selection
  if (question.includes('발생률') && (question.includes('영향') || question.includes('바꾸'))) {
    selectedFunction = 'findProductsByAssumption';
    parameters = { assumptionName: '갑상선암 발생률' };
    reasoning = '가정 변경에 따른 영향을 받는 상품을 찾는 질문이므로 findProductsByAssumption 함수를 선택했습니다.';
  } 
  else if (question.includes('보험료') && question.includes('통계')) {
    selectedFunction = 'getProductPremiumStatistics';
    parameters = { year: '2024', productType: 'thyroidCancer' };
    reasoning = '보험료 통계를 요청하는 질문이므로 getProductPremiumStatistics 함수를 선택했습니다.';
  }
  else if (question.includes('설계') && question.includes('이력')) {
    selectedFunction = 'getProductDesignHistory';
    parameters = { productName: question.includes('갑상선암') ? '갑상선암' : '' };
    reasoning = '상품 설계 이력을 조회하는 질문이므로 getProductDesignHistory 함수를 선택했습니다.';
  }
  else if (question.includes('irr') || question.includes('수익률') || question.includes('재무')) {
    selectedFunction = 'getFinancialMetrics';
    parameters = { year: '2024', productName: '' };
    reasoning = '재무 지표를 조회하는 질문이므로 getFinancialMetrics 함수를 선택했습니다.';
  }
  else if (question.includes('리스크') || question.includes('클레임')) {
    selectedFunction = 'getRiskMetrics';
    parameters = { year: '2024', productType: '' };
    reasoning = '리스크 지표를 조회하는 질문이므로 getRiskMetrics 함수를 선택했습니다.';
  }
  else if (question.includes('계약') && question.includes('통계')) {
    selectedFunction = 'getContractStatistics';
    parameters = { year: '2024', productName: '' };
    reasoning = '계약 통계를 조회하는 질문이므로 getContractStatistics 함수를 선택했습니다.';
  }
  else if (question.includes('연도별') || question.includes('년도별')) {
    selectedFunction = 'getYearlyStatistics';
    parameters = { year: question.includes('2024') ? '2024' : null };
    reasoning = '연도별 통계를 조회하는 질문이므로 getYearlyStatistics 함수를 선택했습니다.';
  }
  else if (question.includes('검색') || question.includes('찾')) {
    selectedFunction = 'searchProductByKeyword';
    parameters = { keyword: '갑상선암' };
    reasoning = '상품 검색 질문이므로 searchProductByKeyword 함수를 선택했습니다.';
  }
  else {
    // Default fallback
    selectedFunction = 'searchProductByKeyword';
    parameters = { keyword: '건강보험' };
    reasoning = '일반적인 검색 질문으로 판단하여 searchProductByKeyword 함수를 선택했습니다.';
  }

  return {
    selectedFunction,
    parameters,
    reasoning
  };
}

// Mock response generator
export async function generateResponse(question, retrievalResult) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const { functionUsed, results } = retrievalResult;
  
  if (results.length === 0) {
    return '조회 결과가 없습니다.';
  }

  // Generate response based on function type
  switch (functionUsed) {
    case 'findProductsByAssumption':
      const products = results.map(r => r.productName).join(', ');
      return `갑상선암 발생률 변경 시 영향을 받는 상품은 다음과 같습니다: ${products}. 총 ${results.length}개의 상품이 해당 가정을 사용하고 있습니다.`;
    
    case 'getProductPremiumStatistics':
      const premiums = results.map(r => 
        `${r.productName}: 평균 ${r.premiumStats.averageMonthlyPremium.toLocaleString()}원`
      ).join(', ');
      return `2024년 갑상선암 상품들의 보험료 통계입니다: ${premiums}`;
    
    case 'getFinancialMetrics':
      const metrics = results.map(r => 
        `${r.productName}: IRR ${(r.financialMetrics.IRR * 100).toFixed(1)}%, 수익률 ${(r.financialMetrics.profitMargin * 100).toFixed(1)}%`
      ).join(', ');
      return `재무 지표 조회 결과: ${metrics}`;
    
    case 'getRiskMetrics':
      const risks = results.map(r => 
        `${r.productName}: 클레임 빈도 ${r.riskMetrics.claimFrequency}, 평균 클레임 ${r.riskMetrics.averageClaimAmount.toLocaleString()}원`
      ).join(', ');
      return `리스크 지표 조회 결과: ${risks}`;
    
    default:
      return `조회가 완료되었습니다. 총 ${results.length}개의 결과를 찾았습니다.`;
  }
}

// Execute query with mock LLM
export async function executeQuery(question) {
  const startTime = Date.now();
  
  const functionSelection = await selectRetrievalFunction(question);
  
  const selectedFunc = retrievalFunctions[functionSelection.selectedFunction];
  if (!selectedFunc) {
    throw new Error(`Function ${functionSelection.selectedFunction} not found`);
  }
  
  const retrievalResult = selectedFunc.execute(functionSelection.parameters);
  
  const response = await generateResponse(question, retrievalResult);
  
  const endTime = Date.now();
  
  return {
    functionSelection,
    retrievalResult,
    response,
    executionTimeMs: endTime - startTime,
    executionPath: {
      functionUsed: functionSelection.selectedFunction,
      category: retrievalResult.category,
      resultCount: retrievalResult.results.length
    }
  };
}