# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an LLM Retrieval Experiment Platform designed to test how LLM-based agents intelligently select between Explicit Memory (relationship-based) and Precomputed Statistics (numerical) retrieval functions for insurance product queries. The active codebase is in the `/llm-retrieval-experiment/` subdirectory.

## Development Commands

### Backend
```bash
cd llm-retrieval-experiment/backend
npm install
npm run dev     # Start development server with nodemon
npm start       # Start production server
```

### Frontend
```bash
cd llm-retrieval-experiment/frontend
npm install
npm run dev     # Start Vite dev server
npm run build   # Build for production
npm run preview # Preview production build
```

### Environment Setup
Create `.env` file in backend directory:
```
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

## Architecture Overview

### System Flow
```
User Query → Frontend (React) → Backend API → Gemini (Function Selection) → Retrieval Function → JSON Data → Gemini (Response Generation) → User
```

### Key Architectural Decisions

1. **Function Selection Pattern**: The system uses Gemini 2.0 Flash to analyze user questions and select from 10 predefined retrieval functions based on their descriptions.

2. **Data Segregation**: 
   - `explicitMemory.json`: Product-assumption connections, design history (for relationship queries)
   - `precomputedStatistics.json`: Financial metrics, premiums, risk data (for statistical queries)

3. **Parallel Execution**: The `/api/chat` endpoint supports `executeInParallel: true` to test LLM consistency by running the same query twice.

4. **Retrieval Functions**: Each function in `retrievalFunctions.js` has:
   - `name`: Function identifier
   - `description`: Used by LLM for selection
   - `category`: Either 'explicit_memory' or 'precomputed_statistics'
   - `execute`: Implementation that queries JSON data

### Critical Implementation Details

1. **LLM Function Selection** (`server.js`):
   - System prompt includes all function descriptions
   - Response format enforced as JSON with `selectedFunction`, `parameters`, and `reasoning`
   - Selected function is executed dynamically from the `retrievalFunctions` object

2. **Frontend-Backend Communication**:
   - Vite proxy configured to forward `/api/*` requests to `localhost:3001`
   - All API responses include execution metadata (timing, function used, category)

3. **Korean Language Context**: UI and test scenarios are in Korean, targeting insurance domain terminology.

## Testing Scenarios

The system includes two predefined scenarios to validate the architecture:

- **Scenario A**: "갑상선암 발생률을 바꾸면 영향을 받는 상품은?" → Should select Explicit Memory functions
- **Scenario B**: "2024년 판매 갑상선암 상품들의 보험료 통계는?" → Should select Precomputed Statistics functions

## Data Structure Notes

- Product IDs follow pattern: PROD001, PROD002, etc.
- Assumption IDs follow pattern: ASMP001, ASMP002, etc.
- All financial values are in Korean Won (KRW)
- Dates use ISO format (YYYY-MM-DD)