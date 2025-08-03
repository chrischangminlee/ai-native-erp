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
import entityMappings from './data/entityMappings.json';

export class LLMService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    this.functionDescriptions = getFunctionDescriptions();
    this.entityMappings = entityMappings;
  }

  /**
   * Process user query and return structured response
   */
  async processQuery(userQuery, enableDebug = true) {
    try {
      // Step 1: Extract entities from the query
      const extractedEntities = await this.extractEntities(userQuery);
      
      // Step 2: Resolve entities to codes using fuzzy matching
      const resolvedEntities = this.resolveEntities(extractedEntities);
      
      // Step 3: Confirm entity matches if needed
      const confirmedEntities = await this.confirmEntityMatches(userQuery, resolvedEntities);
      
      // Step 4: Understand query intent and required functions
      const understanding = await this.understandQuery(userQuery, confirmedEntities);
      
      // Step 5: Execute retrieval functions
      const retrievalResults = await this.executeRetrievals(understanding);
      
      // Step 6: Generate response
      const response = await this.generateResponse(
        userQuery, 
        understanding, 
        retrievalResults
      );

      return {
        success: true,
        response: response,
        debug: enableDebug ? {
          extractedEntities,
          resolvedEntities,
          confirmedEntities,
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
   * Step 1: Extract entities from the user query
   */
  async extractEntities(userQuery) {
    const prompt = `
Extract potential entities (assumptions, products, categories) from this query:
"${userQuery}"

Return a JSON object with:
{
  "assumptions": ["extracted assumption terms"],
  "products": ["extracted product terms"],
  "categories": ["extracted category terms"],
  "years": ["extracted years"],
  "otherTerms": ["other relevant terms"]
}

Extract actual terms from the query, not codes. For example:
- If user says "할인률", extract "할인률"
- If user says "갑상선암 보험", extract "갑상선암 보험"
`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  }

  /**
   * Step 2: Resolve extracted entities to codes using fuzzy matching
   */
  resolveEntities(extractedEntities) {
    const resolved = {
      assumptions: [],
      products: [],
      categories: []
    };

    // Resolve assumptions
    if (extractedEntities.assumptions) {
      extractedEntities.assumptions.forEach(term => {
        const match = this.findBestMatch(term, 'assumptions');
        if (match) {
          resolved.assumptions.push(match);
        }
      });
    }

    // Resolve products
    if (extractedEntities.products) {
      extractedEntities.products.forEach(term => {
        const match = this.findBestMatch(term, 'products');
        if (match) {
          resolved.products.push(match);
        }
      });
    }

    // Resolve categories
    if (extractedEntities.categories) {
      extractedEntities.categories.forEach(term => {
        const match = this.findBestMatch(term, 'categories');
        if (match) {
          resolved.categories.push(match);
        }
      });
    }

    // Copy other data
    resolved.years = extractedEntities.years || [];
    resolved.otherTerms = extractedEntities.otherTerms || [];

    return resolved;
  }

  /**
   * Find best match for a term in entity mappings
   */
  findBestMatch(term, entityType) {
    const termLower = term.toLowerCase().replace(/\s+/g, '');
    const entities = this.entityMappings[entityType];
    
    for (const [code, entity] of Object.entries(entities)) {
      // Check primary name
      if (entity.primaryName.toLowerCase().replace(/\s+/g, '') === termLower) {
        return {
          code,
          matchedTerm: term,
          primaryName: entity.primaryName,
          confidence: 1.0,
          matchType: 'exact'
        };
      }
      
      // Check aliases
      for (const alias of entity.aliases || []) {
        if (alias.toLowerCase().replace(/\s+/g, '') === termLower) {
          return {
            code,
            matchedTerm: term,
            primaryName: entity.primaryName,
            confidence: 0.9,
            matchType: 'alias'
          };
        }
      }
    }
    
    // Fuzzy match - check if term is contained in names/aliases
    for (const [code, entity] of Object.entries(entities)) {
      const allNames = [entity.primaryName, ...(entity.aliases || [])];
      for (const name of allNames) {
        const nameLower = name.toLowerCase().replace(/\s+/g, '');
        if (nameLower.includes(termLower) || termLower.includes(nameLower)) {
          return {
            code,
            matchedTerm: term,
            primaryName: entity.primaryName,
            confidence: 0.7,
            matchType: 'fuzzy'
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Step 3: Confirm entity matches with LLM
   */
  async confirmEntityMatches(userQuery, resolvedEntities) {
    // Only confirm if there are fuzzy matches or low confidence matches
    const needsConfirmation = [
      ...resolvedEntities.assumptions,
      ...resolvedEntities.products,
      ...resolvedEntities.categories
    ].some(match => match && match.confidence < 0.9);

    if (!needsConfirmation) {
      return resolvedEntities;
    }

    const prompt = `
User asked: "${userQuery}"

I found these potential matches:
${JSON.stringify(resolvedEntities, null, 2)}

Please confirm if these matches are correct based on the context of the query.
Return the same structure but set confirmed: true/false for each match.

For example, if user said "할인률" and we matched it to "할인율", that's correct (confirmed: true).
But if the match seems wrong based on context, set confirmed: false.
`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    
    // For now, if confirmation fails, just return original resolved entities
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const confirmed = JSON.parse(jsonMatch[0]);
        // Filter out non-confirmed matches
        return {
          assumptions: (confirmed.assumptions || []).filter(m => m.confirmed !== false),
          products: (confirmed.products || []).filter(m => m.confirmed !== false),
          categories: (confirmed.categories || []).filter(m => m.confirmed !== false),
          years: resolvedEntities.years,
          otherTerms: resolvedEntities.otherTerms
        };
      }
    } catch (e) {
      // If parsing fails, return original
    }
    
    return resolvedEntities;
  }

  /**
   * Step 4: Understand the query and extract parameters
   */
  async understandQuery(userQuery, confirmedEntities) {
    // Convert confirmed entities to codes
    const entityCodes = {
      assumptionCodes: confirmedEntities.assumptions.map(a => a.code),
      productCodes: confirmedEntities.products.map(p => p.code),
      categoryCodes: confirmedEntities.categories.map(c => c.code),
      years: confirmedEntities.years
    };

    const prompt = `
You are analyzing a business query about insurance products. Extract the following information:

Available Functions:
${JSON.stringify(this.functionDescriptions, null, 2)}

User Query: "${userQuery}"

Resolved Entities:
${JSON.stringify(confirmedEntities, null, 2)}

Entity Codes to Use:
${JSON.stringify(entityCodes, null, 2)}

Extract and return a JSON object with:
{
  "intent": "What the user wants to know",
  "requiredFunctions": [
    {
      "functionName": "exact function name from available functions",
      "parameters": {
        "paramName": "value from entity codes"
      },
      "reason": "why this function is needed"
    }
  ],
  "extractedEntities": ${JSON.stringify(entityCodes)}
}

Use the entity codes provided above when selecting parameters. For example:
- If the user asks about an assumption, use the assumptionCode from the resolved entities
- If the user asks about a product, use the productCode from the resolved entities

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
   * Step 5: Execute the required retrieval functions
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
   * Step 6: Generate natural language response
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