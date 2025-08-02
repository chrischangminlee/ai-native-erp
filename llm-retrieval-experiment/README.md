# LLM Retrieval 실험 플랫폼 (Gemini AI)

LLM 기반 Retrieval AI Agent의 정보 탐색 방식을 비교하는 실험 플랫폼입니다. Google Gemini AI를 사용하여 실제 LLM 기반 함수 선택 및 응답 생성을 수행합니다.

## 핵심 개념: 두 가지 정보 소스

### 1. Explicit Memory (관계형 컨텍스트)
**Explicit Memory**는 정보 노드 간의 관계와 연결을 저장하는 구조입니다. 이는 다음과 같은 중요성을 가집니다:
- **관계 추적**: 상품과 가정 간의 연결 관계를 명시적으로 저장하여 변경 영향도 분석 가능
- **이력 관리**: 각 상품의 설계 변경 이력과 담당자 정보를 통해 의사결정 과정 추적
- **영향도 분석**: 특정 가정이 변경될 때 영향받는 모든 상품을 즉시 파악 가능

### 2. Precomputed Statistics (사전 계산된 비즈니스 지표)
**Precomputed Statistics**는 비즈니스 의사결정에 필요한 신뢰할 수 있는 수치를 사전에 계산하여 저장합니다:
- **즉각적 인사이트**: 복잡한 계산 없이 바로 활용 가능한 IRR, 손해율 등의 핵심 지표 제공
- **일관성 보장**: 사전 계산된 값으로 모든 사용자에게 동일한 수치 제공
- **성능 최적화**: 실시간 계산 부담 없이 빠른 응답 가능
- **의사결정 지원**: 검증된 통계 데이터로 신뢰할 수 있는 비즈니스 결정 지원

## 실험 목적

- LLM이 질문의 성격을 파악하여 관계 탐색(Explicit Memory)과 수치 조회(Precomputed Statistics) 중 적절한 방식을 선택하는지 검증
- 두 가지 정보 소스의 상호보완적 활용 가능성 탐구
- 비즈니스 컨텍스트에서 LLM의 정보 탐색 패턴 분석

## 특징

- Google Gemini AI를 브라우저에서 직접 호출
- 백엔드 서버 없이 프론트엔드만으로 작동
- 실시간 LLM 기반 함수 선택 및 응답 생성
- Vercel 등 정적 호스팅 서비스에 배포 가능

## 설치 및 실행

1. Gemini API 키 설정:
```bash
cd llm-retrieval-experiment/frontend
cp .env.example .env
# .env 파일을 열어 VITE_GEMINI_API_KEY에 실제 API 키 입력
```

2. 의존성 설치 및 실행:
```bash
npm install
npm run dev
```

## Vercel 배포

1. GitHub에 코드 푸시
2. Vercel에서 GitHub 저장소 연결
3. 환경 변수 설정:
   - Vercel 대시보드에서 `VITE_GEMINI_API_KEY` 추가
4. 자동으로 빌드 및 배포 완료

## API 키 발급

[Google AI Studio](https://makersuite.google.com/app/apikey)에서 Gemini API 키를 발급받을 수 있습니다.

## 주요 기능과 데이터 구조

### Explicit Memory 구조
```json
{
  "productAssumptionConnections": [
    {
      "productId": "PROD001",
      "productName": "갑상선암 건강보험 A",
      "assumptions": [
        {
          "assumptionName": "갑상선암 발생률",
          "baseValue": 0.0025
        }
      ],
      "designHistory": [...]
    }
  ],
  "assumptionRelationships": [
    {
      "assumptionId": "ASMP001",
      "relatedProducts": ["PROD001", "PROD002", "PROD003"],
      "impactLevel": "HIGH"
    }
  ]
}
```
**중요성**: 한 가정의 변경이 여러 상품에 미치는 파급 효과를 즉시 파악 가능

### Precomputed Statistics 구조
```json
{
  "productStatistics": {
    "2024": {
      "thyroidCancerProducts": [
        {
          "productId": "PROD001",
          "financialMetrics": {
            "IRR": 0.125,
            "profitMargin": 0.22,
            "lossRatio": 0.45
          },
          "premiumStats": {
            "averageMonthlyPremium": 35000,
            "totalPremiumCollected": 1250000000
          }
        }
      ]
    }
  }
}
```
**중요성**: 검증된 재무 지표로 즉각적인 비즈니스 의사결정 지원

## 실험 시나리오와 기대 효과

### 시나리오 A: 관계 기반 질문
**질문**: "갑상선암 발생률을 바꾸면 영향을 받는 상품은?"
- **활용 데이터**: Explicit Memory
- **비즈니스 가치**: 가정 변경 시 영향 범위를 사전에 파악하여 리스크 관리

### 시나리오 B: 수치 기반 질문
**질문**: "2024년 판매 갑상선암 상품들의 보험료 통계는?"
- **활용 데이터**: Precomputed Statistics
- **비즈니스 가치**: 신뢰할 수 있는 통계로 가격 정책 및 시장 전략 수립

## 아키텍처의 장점

1. **정보의 이원화**: 관계 정보와 수치 정보를 분리하여 각각 최적화된 방식으로 관리
2. **확장성**: 새로운 관계나 통계를 독립적으로 추가 가능
3. **신뢰성**: 사전 계산된 값으로 일관된 결과 보장
4. **성능**: 복잡한 실시간 계산 없이 즉각적인 응답 제공