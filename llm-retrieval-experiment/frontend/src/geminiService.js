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
  Given a user question, select the most appropriate retrieval function.
  
  Available functions:
  ${functionDescriptions.map(f => `- ${f.name}: ${f.description} (Category: ${f.category})`).join('\n')}
  
  Respond with a JSON object containing:
  - selectedFunction: the function name
  - parameters: object with required parameters
  - reasoning: brief explanation of why this function was selected
  
  User Question: ${userQuestion}`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text);
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
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