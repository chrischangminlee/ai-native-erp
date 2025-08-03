# Demo V4 - LLM Retrieval 실험 플랫폼

## Overview
Clean architecture implementation for LLM retrieval experiment platform with strict separation between LLM (natural language processing) and retrieval functions (exact key matching).

## Architecture Components

### 1. Data Structures
- **Explicit Memory** (`data/explicitProductAssumptionMemory.json`)
  - Product-assumption relationships
  - Shows which products are affected by assumption changes
  - Key: assumptionCode → affected products list

- **Precomputed Statistics** (`data/precomputedStatistics.json`)
  - Pre-calculated business metrics by product and year
  - Includes premium, claims, profitability metrics
  - Key: productCode → year → metrics

### 2. Retrieval Functions (`retrievalFunctions.js`)
Generic key-based retrieval functions:
- `getProductsByAssumption` - Find products affected by an assumption
- `getAssumptionsByProduct` - Find assumptions used by a product
- `getProductProfitability` - Get profitability metrics
- `getPremiumStatisticsByProduct` - Get yearly premium statistics
- `getAggregatedMetrics` - Get aggregated metrics by year or category

### 3. LLM Service (`llmService.js`)
Handles all natural language processing:
1. Understanding user queries
2. Extracting required parameters
3. Selecting appropriate retrieval functions
4. Generating natural language responses

### 4. UI Components (`App.jsx`)
- Scenario showcase
- Query interface with debug mode
- System function documentation
- Data structure visualization

## Key Design Principles
1. **Strict Separation**: LLM handles NLP, functions do exact matching only
2. **Generic Functions**: Not hardcoded for specific scenarios
3. **Transparent Process**: Debug mode shows query understanding and function calls
4. **Key-based Retrieval**: All data access through standardized codes

## Example Scenarios

### Scenario 1: 갑상선암 발생률 변경시 영향받는 상품
- Query: "갑상선암 발생률이 변경되면 어떤 상품들이 영향을 받나요?"
- Function: `getProductsByAssumption`
- Key: `assumptionCode: "C51"`

### Scenario 2: 2024년 출시 상품 수익성 분석
- Query: "2024년에 판매한 상품들의 수익성은 어떤가요?"
- Function: `getProductProfitability`
- Key: `year: "2024"`

### Scenario 3: 상품별 연도별 보험료 통계
- Query: "갑상선암 건강보험 A의 연도별 보험료 통계를 보여주세요"
- Function: `getPremiumStatisticsByProduct`
- Key: `productCode: "PROD-001"`

## Running the Application
1. Ensure Gemini API key is set
2. Run `npm run dev`
3. Access at `http://localhost:5173`