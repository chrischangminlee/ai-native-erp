# LLM Retrieval 실험 플랫폼

LLM 기반 Retrieval AI Agent의 정보 탐색 방식을 비교하는 실험 플랫폼입니다.

## 실험 목적

- LLM이 자연어 질문에 따라 적절한 Retrieval Function을 선택할 수 있는지 확인
- Explicit Memory 기반 탐색과 Precomputed Statistics 기반 탐색의 차이를 비교
- 동일 질문을 병렬 실행하여 처리 경로와 응답 결과의 일관성을 검증

## 설치 및 실행

### 1. Backend 설정

```bash
cd backend
npm install

# .env 파일 생성 후 OpenAI API 키 설정
cp .env.example .env
# OPENAI_API_KEY=your_key_here 추가

npm run dev
```

### 2. Frontend 설정

```bash
cd frontend
npm install
npm run dev
```

## 주요 기능

1. **Explicit Memory**: 상품-가정 연결 정보, 설계 이력 등 구조화된 관계 정보
2. **Precomputed Statistics**: 상품별 보험료, 발생률, IRR 등 사전 계산된 수치 정보
3. **병렬 실행**: 동일 질문을 두 번 실행하여 일관성 검증
4. **실행 경로 추적**: 선택된 함수, 카테고리, 실행 시간 등 상세 정보 제공

## 테스트 시나리오

- **시나리오 A**: "갑상선암 발생률을 바꾸면 영향을 받는 상품은?" (Explicit Memory)
- **시나리오 B**: "2024년 판매 갑상선암 상품들의 보험료 통계는?" (Precomputed Statistics)