# Textbook Question Maker Agent

교육과정 정합적 수학 문항을 영어로 생성하고, 추천 문항을 큐레이션하는 교사용 저작 도구

## 프로젝트 구조

- `packages/core` - 핵심 생성 엔진 (Claude Agent SDK 연동)
- `packages/server` - API 서버 (Fastify)
- `packages/web` - 교사용 저작 UI (React + Vite)

## 명령어

```bash
# Quick Start
./start.sh           # Unix/Linux/Mac
start.bat            # Windows

# Manual
npm install          # 의존성 설치
npm run dev          # 개발 서버 실행
npm run build        # 빌드
npm run test         # 테스트
npm run typecheck    # 타입 체크
```

## 환경 변수

```
ANTHROPIC_API_KEY=your-api-key
```

<insights>
<!-- 문제 해결 중 얻은 인사이트를 여기에 기록 -->
</insights>
