# Textbook Question Maker Agent

교육과정 정합적 수학 문항을 영어로 생성하고, 추천 문항을 큐레이션하는 교사용 저작 도구

## Features

- **문항 생성**: 학년/과목/주제/난이도/영어수준 기반 수학 문항 자동 생성
- **추천 세트**: 진단/연습/변형/심화 4단계 학습 경로 추천
- **다국어 지원**: CEFR 기준 영어 수준 (A1-B2) 맞춤 지문 생성
- **Claude Agent SDK**: Claude Code 인증 기반 LLM 연동

## Quick Start

### Prerequisites

- Node.js 18+
- Claude Code authenticated (`claude` 명령 실행하여 로그인)

### Run

**Windows:**
```batch
start.bat
```

**Unix/Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

### Manual Setup

```bash
npm install          # 의존성 설치
npm run build        # 빌드
npm run dev          # 개발 서버 실행
```

## Access

- **API Server**: http://localhost:4001
- **Web UI**: http://localhost:4002

## Project Structure

```
txtbk-quiz-maker-agent/
├── packages/
│   ├── core/           # 핵심 생성 엔진
│   │   └── src/
│   │       ├── agent/      # Claude Agent SDK 연동
│   │       ├── generator/  # 문항 생성 로직
│   │       ├── validator/  # 검증 파이프라인
│   │       └── recommender/# 추천 로직
│   ├── server/         # Fastify API 서버
│   └── web/            # React + Vite UI
├── data/
│   └── templates/      # 문항 템플릿
├── docs/
│   └── changelog/      # 변경 이력
├── start.bat           # Windows 실행 스크립트
└── start.sh            # Unix 실행 스크립트
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate` | POST | 즉시 문항 생성 |
| `/api/generate/single` | POST | 단일 문항 재생성 |
| `/api/recommend` | POST | 추천 세트 생성 |
| `/api/export/json` | POST | JSON 내보내기 |
| `/api/export/text` | POST | 텍스트 내보내기 |
| `/health` | GET | 서버 상태 확인 |

## Authentication

Claude Agent SDK는 Claude Code 인증을 자동으로 상속합니다.

```bash
# 최초 1회 인증 필요
claude
# 프롬프트에 따라 로그인
```

`ANTHROPIC_API_KEY` 환경변수는 필요하지 않습니다.

## Development

```bash
npm run dev          # 개발 서버 (hot reload)
npm run build        # 프로덕션 빌드
npm run test         # 테스트 실행
npm run typecheck    # 타입 체크
npm run lint         # 린트 체크
```

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.3
- **Build**: Turborepo + npm workspaces
- **API**: Fastify 4.x
- **UI**: React 18 + Vite 5
- **LLM**: Claude Agent SDK (claude-sonnet-4-5)
- **Math**: mathjs, KaTeX

## License

Private
