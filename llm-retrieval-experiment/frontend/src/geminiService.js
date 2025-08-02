import { GoogleGenerativeAI } from '@google/generative-ai';
import { retrievalFunctions, getFunctionDescriptions } from './retrievalFunctions';

// Check if API key exists
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.error('Gemini API key is not set properly');
  throw new Error('Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your .env file');
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(apiKey);

export async function selectRetrievalFunction(userQuestion) {
  const functionDescriptions = getFunctionDescriptions();
  
  const prompt = `You are a function selector for an insurance product information system.
  
  Available functions:
  ${functionDescriptions.map(f => `- ${f.name}: ${f.description} (Category: ${f.category})`).join('\n')}
  
  User Question: ${userQuestion}
  
  Select the most appropriate function and return ONLY a JSON object (no other text).
  
  Example response format:
  {"selectedFunction": "findProductsByAssumption", "parameters": {"assumptionName": "갑상선암 발생률"}, "reasoning": "The user asks about products affected by thyroid cancer rate changes"}
  
  Guidelines:
  - For "갑상선암 발생률" questions → use findProductsByAssumption
  - For "보험료 통계" questions → use getProductPremiumStatistics
  - For "설계 이력" questions → use getProductDesignHistory
  - For "재무 지표" or "IRR" questions → use getFinancialMetrics
  
  Return only valid JSON, no explanations or markdown.`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash"
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Raw Gemini response:', text);
    
    // Try to extract JSON from the response
    let jsonText = text.trim();
    
    // If the response contains markdown code blocks, extract the JSON
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }
    
    // Try to parse the response text as JSON
    try {
      const parsed = JSON.parse(jsonText);
      console.log('Parsed response:', parsed);
      return parsed;
    } catch (parseError) {
      console.error('Failed to parse JSON response:', text);
      console.error('Parse error:', parseError);
      
      // Fallback: try to use a default based on the question
      if (userQuestion.includes('갑상선암 발생률')) {
        return {
          selectedFunction: 'findProductsByAssumption',
          parameters: { assumptionName: '갑상선암 발생률' },
          reasoning: 'Fallback: Question mentions thyroid cancer incidence rate'
        };
      } else if (userQuestion.includes('보험료 통계')) {
        return {
          selectedFunction: 'getProductPremiumStatistics',
          parameters: { year: '2024', productType: 'thyroidCancer' },
          reasoning: 'Fallback: Question mentions premium statistics'
        };
      }
      
      throw new Error('Invalid JSON response from Gemini: ' + text.substring(0, 200));
    }
  } catch (error) {
    console.error('Error selecting function:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText
    });
    throw error;
  }
}

export async function generateResponse(question, retrievalResult) {
  const prompt = `You are an insurance product information assistant.
  Based on the retrieval results, provide a clear and concise answer to the user's question.
  Use the data provided to give specific information.
  
  Question: ${question}
  
  Retrieved Data: ${JSON.stringify(retrievalResult.results, null, 2)}`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating response:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText
    });
    throw error;
  }
}

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