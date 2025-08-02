import { GoogleGenerativeAI } from '@google/generative-ai';
import { retrievalFunctions, getFunctionDescriptions } from './retrievalFunctions';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  throw new Error('Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your .env file');
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Enhanced prompt system with clear guidelines for LLM
 */
export async function selectRetrievalFunction(userQuestion) {
  const functionDescriptions = getFunctionDescriptions();
  
  const prompt = `You are an intelligent function selector for an insurance product information system.

Your role:
1. Understand the user's intent
2. Extract relevant entities from the question
3. Select the most appropriate function
4. Format parameters according to the function's requirements

Available functions with their contracts:
${functionDescriptions.map(f => `
Function: ${f.name}
Description: ${f.description}
Category: ${f.category}
Required Parameters: ${JSON.stringify(f.requiredParams)}
Optional Parameters: ${JSON.stringify(f.optionalParams)}
`).join('\n---\n')}

User Question: "${userQuestion}"

Analysis Guidelines:
1. Intent Classification:
   - Impact Analysis: Questions about "what if" scenarios or changes
   - Statistical Query: Questions about metrics, performance, numbers
   - Historical Query: Questions about past events, designers, dates
   - Comparison: Questions comparing multiple items
   - Trend Analysis: Questions about changes over time

2. Entity Extraction:
   - Years: Extract as "2023", "2024" format
   - Product Categories: 
     * "갑상선암" → "thyroidCancer"
     * "건강보험", "일반" → "health"
   - Metrics:
     * "수익률", "IRR" → "IRR"
     * "손해율" → "lossRatio"
     * "이익률", "마진" → "profitMargin"
   - Assumption Types:
     * "발생률" → "발생률"
     * "사망률" → "사망률"
     * "해약률" → "해약률"
   - Comparisons:
     * "이상", "초과" → "above"
     * "이하", "미만" → "below"

3. Parameter Mapping:
   Map extracted entities to the function's parameter names exactly as specified.

4. Missing Information:
   If critical parameters are missing, indicate what additional information is needed.

Return Format:
{
  "selectedFunction": "functionName",
  "parameters": {
    // Include all required parameters
    // Include relevant optional parameters
  },
  "reasoning": "Brief explanation",
  "missingInfo": ["list of missing critical info, if any"] // optional
}

Return ONLY valid JSON, no other text or markdown.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      text = jsonMatch[1];
    }
    
    return JSON.parse(text.trim());
  } catch (error) {
    console.error('Error in function selection:', error);
    throw error;
  }
}

/**
 * Generate natural language response from retrieval results
 */
export async function generateResponse(question, retrievalResult, functionSelection) {
  const prompt = `You are an insurance product information assistant providing business insights.

User Question: "${question}"

Function Used: ${functionSelection.selectedFunction}
Parameters: ${JSON.stringify(functionSelection.parameters)}

Retrieved Data:
${JSON.stringify(retrievalResult, null, 2)}

Guidelines:
1. If the query was successful (success: true):
   - Provide clear, actionable insights based on the data
   - Use specific numbers and percentages from the data
   - Organize information logically (bullets or paragraphs)
   - For comparisons, highlight key differences
   - For trends, explain the implications

2. If there was an error:
   - Explain what information is missing
   - Suggest how the user can refine their question
   - List the required parameters if applicable

3. Response Style:
   - Professional but conversational
   - Focus on business value and insights
   - Use Korean naturally
   - Include specific data points, not generalizations

Generate a helpful response in Korean.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

/**
 * Execute complete query flow with better error handling
 */
export async function executeQuery(question) {
  const startTime = Date.now();
  
  try {
    // Step 1: Function selection with entity extraction
    const functionSelection = await selectRetrievalFunction(question);
    
    // Step 2: Check if we need more information
    if (functionSelection.missingInfo && functionSelection.missingInfo.length > 0) {
      return {
        success: false,
        needsMoreInfo: true,
        missingInfo: functionSelection.missingInfo,
        message: `다음 정보가 필요합니다: ${functionSelection.missingInfo.join(', ')}`,
        executionTimeMs: Date.now() - startTime
      };
    }
    
    // Step 3: Execute the selected function
    const selectedFunc = retrievalFunctions[functionSelection.selectedFunction];
    if (!selectedFunc) {
      throw new Error(`Function ${functionSelection.selectedFunction} not found`);
    }
    
    const retrievalResult = selectedFunc.execute(functionSelection.parameters);
    
    // Step 4: Generate natural language response
    const response = await generateResponse(question, retrievalResult, functionSelection);
    
    return {
      success: true,
      functionSelection,
      retrievalResult,
      response,
      executionTimeMs: Date.now() - startTime,
      executionPath: {
        functionUsed: functionSelection.selectedFunction,
        category: selectedFunc.category,
        resultCount: retrievalResult.data ? retrievalResult.data.length : 0
      }
    };
  } catch (error) {
    console.error('Error in query execution:', error);
    return {
      success: false,
      error: error.message,
      executionTimeMs: Date.now() - startTime
    };
  }
}