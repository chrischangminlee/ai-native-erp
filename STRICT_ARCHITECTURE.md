# Strict Separation Architecture: LLM + Retrieval Functions

## 핵심 철학

### 문제 정의
- **LLM만 사용**: 정확한 데이터 추출 어려움 (환각, 불일치)
- **DB 쿼리만 사용**: 자연어 유연성 상실
- **해결책**: LLM + Retrieval Function + 표준화된 메모리 구조

### 검증 목표
현업이 자연어로 묻고, 시스템은 정확히 데이터를 찾아 추론-설명하는 흐름이 가능한지 검증

## 아키텍처 원칙

### 1. LLM의 역할 (자연어 처리 전담)
```
자연어 입력 → 의도 파악 → 엔티티 추출 → 표준 코드 변환 → 응답 생성
```
- 동의어/유사어 처리 (갑상선암, thyroid cancer → ASMP_THYROID_INCIDENCE)
- 맥락 이해 (작년 대비 → 2023 vs 2024)
- 모호성 해결 (12% 이상 → threshold: 0.12, operator: OP_GREATER_EQUAL)

### 2. Retrieval Functions의 역할 (정확한 데이터 조회 전담)
```
표준 코드 입력 → 정확한 키 매칭 → 구조화된 데이터 반환
```
- NO fuzzy matching
- NO includes() or toLowerCase()
- ONLY exact key lookup
- 예: getProductMetric("PROD001", "METRIC_IRR", "2024") → 0.125

### 3. 표준화된 메모리 구조

#### Explicit Memory (관계형 장기 기억)
```json
{
  "productAssumptionConnections": {
    "PROD001": {
      "connectedAssumptions": ["ASMP_THYROID_INCIDENCE"],
      "baseValues": {"ASMP_THYROID_INCIDENCE": 0.0025}
    }
  }
}
```
- 목적: 관계, 맥락, 이력 같은 "의미 정보" 저장
- 키: 표준화된 코드 (PROD001, ASMP_THYROID_INCIDENCE)

#### Precomputed Statistics (사전 계산된 지표)
```json
{
  "productMetrics": {
    "2024": {
      "PROD001": {
        "metrics": {"METRIC_IRR": 0.125}
      }
    }
  }
}
```
- 목적: 반복 사용되는 수치를 사전 집계
- 키: 표준화된 코드 + 연도

## 실제 구현 예시

### 1. 자연어 질문
```
"갑상선암 발생률을 변경하면 어떤 상품들이 영향을 받나요?"
```

### 2. LLM의 자연어 → 표준 코드 변환
```javascript
{
  "intent": "assumption_impact_analysis",
  "extractedEntities": {
    "assumptions": ["ASMP_THYROID_INCIDENCE"]
  },
  "selectedFunction": "getProductsByAssumptionCode",
  "parameters": {
    "assumptionCode": "ASMP_THYROID_INCIDENCE"
  }
}
```

### 3. Retrieval Function 실행
```javascript
// 정확한 키 매칭만 수행
const assumptionInfo = explicitMemory.assumptionDependencies["ASMP_THYROID_INCIDENCE"];
return assumptionInfo.affectsProducts; // ["PROD001", "PROD002", "PROD003"]
```

### 4. LLM의 응답 생성
```
갑상선암 발생률 변경 시 영향받는 상품:
- 갑상선암 건강보험 A (PROD001): 현재 발생률 0.25%
- 갑상선암 건강보험 B (PROD002): 현재 발생률 0.28%
- 갑상선암 건강보험 C (PROD003): 현재 발생률 0.30%
```

## 표준 코드 체계

### 1. 가정 코드 (Assumption Codes)
- ASMP_THYROID_INCIDENCE: 갑상선암 발생률
- ASMP_MORTALITY_RATE: 사망률
- ASMP_LAPSE_RATE: 해약률

### 2. 지표 코드 (Metric Codes)
- METRIC_IRR: 내부수익률
- METRIC_LOSS_RATIO: 손해율
- METRIC_PROFIT_MARGIN: 이익률

### 3. 상품 코드 (Product Codes)
- PROD001: 갑상선암 건강보험 A
- PROD002: 갑상선암 건강보험 B
- PROD003: 갑상선암 건강보험 C

### 4. 직원 코드 (Employee Codes)
- EMP001: 김보험
- EMP002: 이설계
- EMP003: 박분석

### 5. 연산자 코드 (Operator Codes)
- OP_GREATER: 초과 (>)
- OP_GREATER_EQUAL: 이상 (>=)
- OP_LESS: 미만 (<)
- OP_LESS_EQUAL: 이하 (<=)

## 장점

1. **정확성**: 표준 코드로 정확한 데이터 조회
2. **유연성**: LLM이 다양한 자연어 표현 처리
3. **확장성**: 새로운 코드/함수 추가 용이
4. **투명성**: 어떤 코드로 어떤 데이터를 조회했는지 명확
5. **일관성**: 동일 질문은 항상 동일 코드로 변환

## 주의사항

1. **코드 관리**: 모든 엔티티는 표준 코드 필수
2. **매핑 관리**: 자연어-코드 매핑 테이블 지속 업데이트
3. **버전 관리**: 코드 변경 시 하위 호환성 고려
4. **에러 처리**: 매핑 실패 시 명확한 피드백

## 향후 확장

1. **다국어 지원**: 매핑 테이블에 언어별 별칭 추가
2. **도메인 확장**: 새로운 비즈니스 도메인의 코드 체계 추가
3. **관계 강화**: 코드 간 관계 정의 (계층구조, 의존성)
4. **버전 관리**: 시간에 따른 코드 변경 이력 관리