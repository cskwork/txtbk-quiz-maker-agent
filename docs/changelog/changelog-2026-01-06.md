# Changelog - 2026-01-06

## 생성형 문항 생성기 POC 구현

### 추가된 기능

#### Core 패키지 (`@tqm/core`)
- 문항 생성 엔진: 템플릿 기반 파라미터 샘플링, mathjs 정답 계산, 오답 생성
- 검증 파이프라인: 수학/언어/정책 규칙 기반 검증
- 추천 로직: 선수/후속 개념 그래프, 3축 합성 (성취기준 거리, 오류모형, 난이도 곡선)
- Claude Agent SDK 래퍼 (mock 구현)

#### Server 패키지 (`@tqm/server`)
- `/api/generate`: 즉시 문항 생성
- `/api/recommend`: 추천 세트 생성 (진단/연습/변형/심화)
- `/api/export`: JSON/텍스트 내보내기

#### Web 패키지 (`@tqm/web`)
- 교사용 저작 UI (React + Vite)
- 입력 패널: 학년/과목/주제/유형/난이도/영어수준 선택
- 결과 패널: 문항 미리보기, 해설 토글
- 추천 패널: 학습 경로 시각화

### 아키텍처
- 모노레포 구조 (npm workspaces + Turborepo)
- TypeScript 5.3, Node.js 18+
- Fastify 4.x, React 18, Vite 5

### 제한 사항 (POC)
- ~~Claude Agent SDK 실제 연동 대기 중 (mock 응답)~~ **해결됨**
- DOCX/PDF 내보내기 미구현 (텍스트 형식으로 대체)
- 교육과정 데이터베이스 미연동

---

## Claude Agent SDK 실제 연동 구현

### 변경 사항

#### `packages/core/src/agent/types.ts` (신규)
- SDK 메시지 타입 정의 (`SDKMessage`, `SDKAssistantMessage` 등)
- `AgentQueryOptions`: 모델, 권한 모드, 예산 제한 옵션
- `AgentError` 클래스: 에러 코드 기반 예외 처리

#### `packages/core/src/agent/index.ts` (수정)
- `runAgent()`: mock에서 실제 `@anthropic-ai/claude-agent-sdk` 연동으로 변경
  - Claude Code 인증 자동 상속 (API 키 불필요)
  - 스트리밍 메시지 처리 (system, assistant, tool_call, tool_result, error)
  - 에러 코드 매핑 (RATE_LIMIT_EXCEEDED, AUTHENTICATION_FAILED 등)
- `generateQuestionsWithAgent()`: JSON 파싱 강화
  - 코드 블록 내 JSON 추출 지원
  - 배열/단일 객체 모두 처리
  - 파싱 실패 시 빈 배열 반환
- `surfaceToEnglish()`: 폴백 로직 추가
  - 빈 응답/JSON 응답 감지 시 템플릿 기반 지문 생성
  - 영어 수준별 폴백 템플릿 (A1-B2)

#### `packages/core/src/index.ts` (수정)
- `AgentError`, `AgentMessage`, `AgentQueryOptions`, `AgentErrorCode` 타입 내보내기 추가

### 테스트
- `packages/core/src/agent/index.test.ts` (신규): 13개 테스트 케이스
  - `runAgent()`: 텍스트 메시지, 콘텐츠 블록, 에러 처리
  - `generateQuestionsWithAgent()`: JSON 파싱, 코드 블록, 실패 케이스
  - `surfaceToEnglish()`: LLM 응답, 폴백 시나리오

### 인증 방식
- Claude Code 인증 사용 (`claude` CLI로 로그인 필요)
- `ANTHROPIC_API_KEY` 환경변수 불필요

---

## 빌드 수정 및 Quick Start 스크립트

### 수정된 파일
- `packages/server/src/routes/export.ts`: implicit any 타입 수정 (choice, step 매개변수)
- `packages/server/tsconfig.json`: paths 및 references 추가 (@tqm/core 해결)
- `packages/core/tsconfig.json`: composite 옵션 추가

### 추가된 파일
- `start.bat`: Windows용 Quick Start 스크립트
- `start.sh`: Unix/Linux/Mac용 Quick Start 스크립트
- `README.md`: 프로젝트 문서
- `CLAUDE.md`: Quick Start 명령어 추가

---

## 서버 포트 충돌 해결

### 문제
- 서버 시작 시 `EADDRINUSE: address already in use 0.0.0.0:3001` 오류
- 이전 실행의 좀비 프로세스가 포트 점유

### 수정 사항
- `packages/server/src/index.ts`: 포트 충돌 시 자동 대체 (3001-3010)
- `start.bat`: 시작 전 포트 3001 사용 프로세스 자동 종료
- `start.sh`: 시작 전 포트 3001 사용 프로세스 자동 종료

### 테스트 결과
- 빌드: 성공
- API 헬스체크: 통과
- 문항 생성 API: 작동 확인
- UI: 즉시 생성/추천 세트 생성 정상 작동
