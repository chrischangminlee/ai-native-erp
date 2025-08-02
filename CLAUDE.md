# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an LLM Retrieval Experiment Platform designed to test how LLM-based agents intelligently select between Explicit Memory (relationship-based) and Precomputed Statistics (numerical) retrieval functions for insurance product queries.

## Critical Concept: Two Complementary Data Sources

### Explicit Memory - Relational Context Engine
**Purpose**: Stores and manages relationships between information nodes
- **Key Insight**: Every insurance product is connected to multiple assumptions (갑상선암 발생률, 사망률, etc.)
- **Business Value**: When an assumption changes, instantly identify ALL affected products
- **Implementation**: Graph-like structure in `explicitMemory.json` with `productAssumptionConnections` and `assumptionRelationships`

### Precomputed Statistics - Decision Support System  
**Purpose**: Provides reliable, pre-calculated business metrics
- **Key Insight**: Business decisions require consistent, validated numerical data
- **Business Value**: Instant access to IRR, profit margins, loss ratios without computation overhead
- **Implementation**: Hierarchical structure in `precomputedStatistics.json` organized by year and product type

**Why This Matters**: The experiment tests whether LLMs can distinguish between queries requiring relationship traversal vs. statistical lookup, mimicking how human experts approach different types of business questions.

## Development Commands

### Frontend (Main Application)
```bash
cd llm-retrieval-experiment/frontend
npm install
npm run dev     # Start Vite dev server
npm run build   # Build for production
npm run preview # Preview production build
```

### Environment Setup
Create `.env` file in frontend directory:
```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Note**: This is a frontend-only application that calls Gemini AI directly from the browser.

## Architecture Overview

### System Flow
```
User Query → Frontend (React) → Gemini AI (Function Selection) → Retrieval Function → Local JSON Data → Gemini AI (Response Generation) → User
```

### Key Architectural Decisions

1. **Function Selection Pattern**: The system uses Gemini 2.5 Flash to analyze user questions and select from 10 predefined retrieval functions based on their descriptions.

2. **Data Architecture - The Core Innovation**: 
   - **Explicit Memory** (`explicitMemory.json`): 
     - Stores product↔assumption relationships
     - Enables "What-If" analysis (e.g., "If 갑상선암 발생률 changes, which products are affected?")
     - Maintains design history for audit trails
   - **Precomputed Statistics** (`precomputedStatistics.json`): 
     - Pre-calculated business metrics (IRR, loss ratios, premiums)
     - Ensures consistency across all queries
     - Eliminates real-time computation overhead

3. **Parallel Execution**: Tests LLM consistency by running the same query twice to verify deterministic function selection.

4. **Retrieval Functions**: Each function in `retrievalFunctions.js` targets specific data needs:
   - Explicit Memory functions: `findProductsByAssumption`, `getAssumptionRelationships`, etc.
   - Precomputed Statistics functions: `getFinancialMetrics`, `getProductPremiumStatistics`, etc.

### Critical Implementation Details

1. **LLM Integration** (`geminiService.js`):
   - Direct browser-to-Gemini API calls (no backend required)
   - Structured prompts ensure JSON response format
   - Fallback logic for common query patterns

2. **Data Loading**:
   - JSON data imported as ES modules for optimal bundling
   - All data embedded in frontend build (no external dependencies)

3. **Business Context**: 
   - Korean insurance terminology throughout
   - Real-world insurance product modeling (CI, Health, Life)
   - Focus on actuarial decision-making scenarios

## Testing Scenarios

The system includes two predefined scenarios to validate the architecture:

- **Scenario A**: "갑상선암 발생률을 바꾸면 영향을 받는 상품은?" → Should select Explicit Memory functions
- **Scenario B**: "2024년 판매 갑상선암 상품들의 보험료 통계는?" → Should select Precomputed Statistics functions

## Data Structure Notes

- Product IDs follow pattern: PROD001, PROD002, etc.
- Assumption IDs follow pattern: ASMP001, ASMP002, etc.
- All financial values are in Korean Won (KRW)
- Dates use ISO format (YYYY-MM-DD)

## Why This Architecture Matters for Development

When working on this codebase, always consider:

1. **Query Intent**: Is the user asking about relationships or statistics?
   - Relationship queries → Explicit Memory functions
   - Statistical queries → Precomputed Statistics functions

2. **Data Consistency**: 
   - Never mix real-time calculations with precomputed values
   - Maintain the separation between relational and statistical data

3. **Business Impact**:
   - Changes to Explicit Memory affect impact analysis capabilities
   - Changes to Precomputed Statistics affect decision-making accuracy

4. **Extension Guidelines**:
   - New relationship types → Add to Explicit Memory structure
   - New metrics → Add to Precomputed Statistics with proper validation
   - New retrieval functions → Clearly categorize as 'explicit_memory' or 'precomputed_statistics'

This dual-data architecture represents a fundamental approach to enterprise information retrieval, where understanding context (relationships) is as important as having accurate metrics (statistics).