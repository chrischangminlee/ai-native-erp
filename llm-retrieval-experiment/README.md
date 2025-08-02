# LLM Retrieval 실험 플랫폼 (Frontend Demo)

LLM 기반 Retrieval AI Agent의 정보 탐색 방식을 비교하는 실험 플랫폼의 프론트엔드 전용 데모 버전입니다.

## 실험 목적

- LLM이 자연어 질문에 따라 적절한 Retrieval Function을 선택할 수 있는지 확인
- Explicit Memory 기반 탐색과 Precomputed Statistics 기반 탐색의 차이를 비교
- 동일 질문을 병렬 실행하여 처리 경로와 응답 결과의 일관성을 검증

## 데모 버전 특징

이 버전은 백엔드 없이 작동하는 프론트엔드 전용 데모입니다:
- 실제 LLM API 대신 키워드 기반 매칭 사용
- 모든 데이터와 로직이 브라우저에서 실행
- Vercel 등 정적 호스팅 서비스에 바로 배포 가능

## 설치 및 실행

```bash
cd llm-retrieval-experiment/frontend
npm install
npm run dev
```

## Vercel 배포

1. GitHub에 코드 푸시
2. Vercel에서 GitHub 저장소 연결
3. 자동으로 빌드 및 배포 완료

## 주요 기능

1. **Explicit Memory**: 상품-가정 연결 정보, 설계 이력 등 구조화된 관계 정보
2. **Precomputed Statistics**: 상품별 보험료, 발생률, IRR 등 사전 계산된 수치 정보
3. **병렬 실행**: 동일 질문을 두 번 실행하여 일관성 검증
4. **실행 경로 추적**: 선택된 함수, 카테고리, 실행 시간 등 상세 정보 제공

## 테스트 시나리오

- **시나리오 A**: "갑상선암 발생률을 바꾸면 영향을 받는 상품은?" (Explicit Memory)
- **시나리오 B**: "2024년 판매 갑상선암 상품들의 보험료 통계는?" (Precomputed Statistics)