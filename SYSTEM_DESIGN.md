# LLM Retrieval System Design Document - Strict Separation Architecture

## Architecture Overview

### 1. Clear Separation of Concerns

**LLM's Responsibilities:**
- Intent understanding
- Entity extraction and normalization
- Function selection
- Parameter formatting
- Response generation

**Retrieval Function's Responsibilities:**
- Accept standardized parameters
- Execute specific queries
- Return structured data
- No interpretation or fuzzy matching

### 2. Business Query Examples

```
Query: "갑상선암 발생률을 5%로 변경하면 어떤 상품들이 영향받나요?"
→ Intent: Impact Analysis
→ Function: getProductsAffectedByAssumption
→ Parameters: {assumptionType: "발생률", assumptionDetail: "갑상선암"}

Query: "2024년 출시된 CI 상품들의 IRR이 12% 이상인 것은?"
→ Intent: Statistical Query with Filter
→ Function: getFinancialMetricsByFilter  
→ Parameters: {year: "2024", metricType: "IRR", threshold: 0.12, comparison: "above"}

Query: "김보험이 설계한 상품들의 이력을 보여주세요"
→ Intent: Historical Query
→ Function: getDesignHistoryByFilter
→ Parameters: {designer: "김보험"}

Query: "작년 대비 올해 실적은 어떻게 변했나요?"
→ Intent: Trend Analysis
→ Function: getYearOverYearPerformance
→ Parameters: {baseYear: "2023", compareYear: "2024"}
```

### 3. Standardized Function Contracts

Each function has:
- **Clear purpose**: Single responsibility
- **Required parameters**: Must be provided
- **Optional parameters**: For filtering/refinement
- **Consistent return format**: 
  ```javascript
  {
    success: boolean,
    queryType: string,
    parameters: object,
    resultCount: number,
    data: array/object,
    error?: string,
    message?: string
  }
  ```

### 4. Entity Extraction Rules

**Korean to System Mapping:**
- "갑상선암" → "thyroidCancer"
- "손해율" → "lossRatio"
- "수익률", "IRR" → "IRR"
- "이상", "초과" → "above"
- "이하", "미만" → "below"

**Date Handling:**
- "작년" → Calculate based on current year
- "올해" → Current year
- "2024년" → "2024"

### 5. Error Handling

**Missing Information:**
```javascript
{
  success: false,
  needsMoreInfo: true,
  missingInfo: ["year", "metricType"],
  message: "다음 정보가 필요합니다: year, metricType"
}
```

**Invalid Parameters:**
```javascript
{
  error: true,
  message: "Missing required parameter: year",
  requiredParams: ["year", "metricType"]
}
```

### 6. Function Categories

**Explicit Memory Functions:**
- `getProductsAffectedByAssumption`: Impact analysis
- `getDesignHistoryByFilter`: Historical queries

**Precomputed Statistics Functions:**
- `getFinancialMetricsByFilter`: Metric queries
- `compareProducts`: Product comparison
- `getYearOverYearPerformance`: Trend analysis

### 7. Implementation Benefits

1. **Predictable**: Clear contracts mean predictable behavior
2. **Testable**: Each function can be tested independently
3. **Maintainable**: Single responsibility makes updates easier
4. **Extensible**: Easy to add new functions following the pattern
5. **Clear errors**: Users know exactly what's missing

### 8. Future Enhancements

1. **Query Builder UI**: Help users construct valid queries
2. **Parameter Validation**: Client-side validation before API calls
3. **Query History**: Learn from past queries to improve suggestions
4. **Batch Queries**: Execute multiple retrievals in one request
5. **Caching**: Cache frequently requested data