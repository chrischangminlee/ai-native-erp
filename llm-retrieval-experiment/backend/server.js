import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { retrievalFunctions, getFunctionDescriptions } from './retrievalFunctions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function selectRetrievalFunction(userQuestion) {
  const functionDescriptions = getFunctionDescriptions();
  
  const systemPrompt = `You are a function selector for an insurance product information system.
  Given a user question, select the most appropriate retrieval function.
  
  Available functions:
  ${functionDescriptions.map(f => `- ${f.name}: ${f.description} (Category: ${f.category})`).join('\n')}
  
  Respond with a JSON object containing:
  - selectedFunction: the function name
  - parameters: object with required parameters
  - reasoning: brief explanation of why this function was selected`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuestion }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('Error selecting function:', error);
    throw error;
  }
}

async function generateResponse(question, retrievalResult) {
  const systemPrompt = `You are an insurance product information assistant.
  Based on the retrieval results, provide a clear and concise answer to the user's question.
  Use the data provided to give specific information.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Question: ${question}\n\nRetrieved Data: ${JSON.stringify(retrievalResult.results, null, 2)}` }
      ]
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    const { question, executeInParallel = false } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (executeInParallel) {
      const [execution1, execution2] = await Promise.all([
        executeQuery(question),
        executeQuery(question)
      ]);
      
      res.json({
        question,
        parallelExecution: true,
        executions: [execution1, execution2],
        timestamp: new Date().toISOString()
      });
    } else {
      const result = await executeQuery(question);
      res.json({
        question,
        parallelExecution: false,
        execution: result,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

async function executeQuery(question) {
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

app.get('/api/functions', (req, res) => {
  res.json({
    functions: getFunctionDescriptions()
  });
});

app.get('/api/test-scenarios', (req, res) => {
  res.json({
    scenarios: [
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
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});