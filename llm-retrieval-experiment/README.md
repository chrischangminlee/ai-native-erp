# LLM Retrieval 실험 플랫폼 (Gemini AI)

LLM 기반 Retrieval AI Agent의 정보 탐색 방식을 비교하는 실험 플랫폼입니다. Google Gemini AI를 사용하여 실제 LLM 기반 함수 선택 및 응답 생성을 수행합니다.

## 실험 목적

- LLM이 자연어 질문에 따라 적절한 Retrieval Function을 선택할 수 있는지 확인
- Explicit Memory 기반 탐색과 Precomputed Statistics 기반 탐색의 차이를 비교
- 동일 질문을 병렬 실행하여 처리 경로와 응답 결과의 일관성을 검증

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

## 주요 기능

1. **Explicit Memory**: 상품-가정 연결 정보, 설계 이력 등 구조화된 관계 정보
2. **Precomputed Statistics**: 상품별 보험료, 발생률, IRR 등 사전 계산된 수치 정보
3. **병렬 실행**: 동일 질문을 두 번 실행하여 일관성 검증
4. **실행 경로 추적**: 선택된 함수, 카테고리, 실행 시간 등 상세 정보 제공

## 테스트 시나리오

- **시나리오 A**: "갑상선암 발생률을 바꾸면 영향을 받는 상품은?" (Explicit Memory)
- **시나리오 B**: "2024년 판매 갑상선암 상품들의 보험료 통계는?" (Precomputed Statistics)