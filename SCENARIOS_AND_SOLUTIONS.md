# 시나리오와 해결 방안: "갑상선상품" 같은 그룹 지칭 문제

## 문제 시나리오

사용자: **"갑상선상품의 평균 IRR은?"**

### 현재 Strict 시스템의 한계
- 개별 상품 코드만 존재 (PROD001, PROD002, PROD003)
- "갑상선상품"이라는 그룹 개념이 없음
- LLM이 어떤 코드로 매핑해야 할지 모호함

## 해결 방안들

### 방안 1: 카테고리 코드 추가 (구현됨) ✅

```json
// standardKeyMappings.json
"productCategories": {
  "CAT_THYROID": {
    "categoryName": "갑상선암 상품군",
    "productCodes": ["PROD001", "PROD002", "PROD003"],
    "aliases": ["갑상선암 상품", "갑상선상품", "갑상선 보험"]
  }
}
```

**LLM 처리:**
```
"갑상선상품" → categoryCode: "CAT_THYROID"
```

**함수 처리:**
```javascript
getProductsByMetricThreshold({
  categoryCode: "CAT_THYROID",
  metricCode: "METRIC_IRR",
  year: "2024"
})
// 자동으로 PROD001, PROD002, PROD003 조회
```

### 방안 2: LLM이 개별 코드로 확장

**LLM 프롬프트 수정:**
```
"갑상선상품"을 인식하면:
productCodes: ["PROD001", "PROD002", "PROD003"]로 확장
```

**장점:** 별도 카테고리 코드 불필요
**단점:** LLM이 모든 상품 목록을 알아야 함

### 방안 3: 검색 함수 추가

```javascript
// 새로운 함수
searchProductsByCriteria: {
  execute: (params) => {
    const { searchType, searchValue } = params;
    // searchType: "name_contains", "type_equals"
    // searchValue: "갑상선", "CI"
  }
}
```

**문제:** Strict 원칙 위반 (함수 내 검색 로직)

### 방안 4: 계층적 코드 체계

```json
{
  "PROD_THYROID": {  // 상위 카테고리
    "PROD_THYROID_001": { },  // 하위 상품
    "PROD_THYROID_002": { }
  }
}
```

**장점:** 코드만으로 계층 파악 가능
**단점:** 기존 코드 체계 전면 수정 필요

## 권장 접근법: 하이브리드

### 1단계: 카테고리 코드 (구현됨)
- 자주 사용되는 그룹은 카테고리 코드로 관리
- LLM이 카테고리 인식 → 카테고리 코드 사용

### 2단계: 폴백 전략
```javascript
// LLM이 처리
if (질문에 "갑상선" 포함 && 구체적 상품명 없음) {
  // 방법 1: 카테고리 코드 사용
  categoryCode: "CAT_THYROID"
  
  // 방법 2: 개별 상품 코드로 확장
  productCodes: ["PROD001", "PROD002", "PROD003"]
}
```

### 3단계: 메타데이터 활용
```javascript
// 함수가 메타데이터 반환
getProductMetadata: {
  execute: ({ categoryCode }) => {
    return {
      category: "갑상선암 상품군",
      products: ["PROD001", "PROD002", "PROD003"],
      commonAttributes: ["CI", "thyroid-related"]
    }
  }
}
```

## 실제 처리 예시

### 질문: "갑상선상품의 평균 손해율은?"

**Step 1 - LLM 변환:**
```json
{
  "intent": "category_metrics",
  "extractedEntities": {
    "categories": ["CAT_THYROID"],
    "metrics": ["METRIC_LOSS_RATIO"]
  },
  "selectedFunction": "getProductsByMetricThreshold",
  "parameters": {
    "categoryCode": "CAT_THYROID",
    "metricCode": "METRIC_LOSS_RATIO",
    "year": "2024",
    "threshold": 0,
    "operatorCode": "OP_GREATER_EQUAL"
  }
}
```

**Step 2 - 함수 실행:**
- CAT_THYROID → PROD001, PROD002, PROD003
- 각 상품의 손해율 조회
- 평균 계산은 LLM이 응답 생성 시 수행

**Step 3 - LLM 응답:**
```
갑상선암 상품군의 2024년 손해율 현황:
- 갑상선암 건강보험 A: 45%
- 갑상선암 건강보험 B: 48%
- 갑상선암 건강보험 C: 42%
평균 손해율: 45%
```

## 결론

Strict 아키텍처에서도 그룹/카테고리 처리 가능:
1. **표준화 확장**: 카테고리 코드 추가
2. **LLM 역할 강화**: 그룹 → 카테고리/개별 코드 변환
3. **함수 유연성**: 카테고리 파라미터 지원
4. **원칙 유지**: 함수는 여전히 정확한 키 매칭만 수행