/**
 * LLM Service for Demo V4
 * 
 * Handles all natural language processing:
 * 1. Understanding user queries
 * 2. Extracting required parameters
 * 3. Selecting appropriate retrieval functions
 * 4. Generating natural language responses
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { retrievalFunctions, getFunctionDescriptions } from './retrievalFunctions';

export class LLMService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    this.functionDescriptions = getFunctionDescriptions();
  }

  /**
   * Process user query and return structured response
   */
  async processQuery(userQuery, enableDebug = true) {
    try {
      // Step 1: Understand query and extract parameters
      const understanding = await this.understandQuery(userQuery);
      
      // Step 2: Execute retrieval functions
      const retrievalResults = await this.executeRetrievals(understanding);
      
      // Step 3: Generate response
      const response = await this.generateResponse(
        userQuery, 
        understanding, 
        retrievalResults
      );

      return {
        success: true,
        response: response,
        debug: enableDebug ? {
          understanding,
          retrievalResults,
          functionsUsed: retrievalResults.map(r => r.functionName)
        } : null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        response: `죄송합니다. 질문을 처리하는 중 오류가 발생했습니다: ${error.message}`
      };
    }
  }

  /**
   * Step 1: Understand the query and extract parameters
   */
  async understandQuery(userQuery) {
    const prompt = `
You are analyzing a business query about insurance products. Extract the following information:

Available Functions:
${JSON.stringify(this.functionDescriptions, null, 2)}

User Query: "${userQuery}"

Extract and return a JSON object with:
{
  "intent": "What the user wants to know",
  "requiredFunctions": [
    {
      "functionName": "exact function name from available functions",
      "parameters": {
        "paramName": "extracted value"
      },
      "reason": "why this function is needed"
    }
  ],
  "extractedEntities": {
    "assumptionCodes": ["C51", etc],
    "productCodes": ["PROD-001", etc],
    "years": ["2024", etc],
    "aggregationType": "year or category",
    "otherParameters": {}
  }
}

Known mappings:
- 갑상선암 발생률 → assumptionCode: "C51"
- 갑상선암 건강보험 A → productCode: "PROD-001"
- 종합건강보험 B → productCode: "PROD-002"
- 종합건강보험 C → productCode: "PROD-003"
- 갑상선암 건강보험 D → productCode: "PROD-004"

Be precise with function selection and parameter extraction.`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract structured data from LLM response');
    }
    
    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Step 2: Execute the required retrieval functions
   */
  async executeRetrievals(understanding) {
    const results = [];
    
    for (const funcReq of understanding.requiredFunctions) {
      const func = retrievalFunctions[funcReq.functionName];
      if (!func) {
        results.push({
          functionName: funcReq.functionName,
          success: false,
          error: `Function ${funcReq.functionName} not found`
        });
        continue;
      }
      
      // Execute the function
      const result = func.execute(funcReq.parameters);
      results.push({
        functionName: funcReq.functionName,
        parameters: funcReq.parameters,
        ...result
      });
    }
    
    return results;
  }

  /**
   * Step 3: Generate natural language response
   */
  async generateResponse(userQuery, understanding, retrievalResults) {
    const prompt = `
You are generating a response to a business query about insurance products.

User Query: "${userQuery}"

Understanding: ${JSON.stringify(understanding, null, 2)}

Retrieved Data: ${JSON.stringify(retrievalResults, null, 2)}

Generate a clear, professional response in Korean that:
1. Directly answers the user's question
2. Presents the data in an easy-to-understand format
3. Highlights key insights or findings
4. Uses appropriate formatting (bullet points, numbers, etc.)

Be concise but comprehensive. Focus on the specific information requested.`;

    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  /**
   * Get scenario examples
   */
  getScenarioExamples() {
    return [
      {
        id: 1,
        title: "갑상선암 발생률 변경시 영향받는 상품 확인",
        description: "특정 가정(assumption)이 변경될 때 어떤 상품들이 영향을 받는지 확인",
        exampleQuery: "갑상선암 발생률이 변경되면 어떤 상품들이 영향을 받나요?",
        dataSource: "Explicit Memory",
        expectedFunction: "getProductsByAssumption"
      },
      {
        id: 2,
        title: "2024년 출시 상품 수익성 분석",
        description: "특정 연도에 출시된 상품들의 보험료 수입과 지급 보험금 분석",
        exampleQuery: "2024년에 판매한 상품들의 수익성은 어떤가요?",
        dataSource: "Precomputed Statistics",
        expectedFunction: "getProductProfitability"
      },
      {
        id: 3,
        title: "상품별 연도별 보험료 통계 분석",
        description: "특정 상품의 연도별 보험료 수입 추이와 계약 건수 변화 분석",
        exampleQuery: "갑상선암 건강보험 A의 연도별 보험료 통계를 보여주세요",
        dataSource: "Precomputed Statistics",
        expectedFunction: "getPremiumStatisticsByProduct"
      }
    ];
  }
}