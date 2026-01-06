// API 서버 진입점
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerGenerateRoutes } from './routes/generate.js';
import { registerRecommendRoutes } from './routes/recommend.js';
import { registerExportRoutes } from './routes/export.js';

const server = Fastify({
  logger: true,
});

// CORS 설정
await server.register(cors, {
  origin: ['http://localhost:4002', 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

// 헬스체크
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API 라우트 등록
registerGenerateRoutes(server);
registerRecommendRoutes(server);
registerExportRoutes(server);

// 서버 시작 (포트 충돌 시 자동 대체)
const start = async () => {
  const basePort = parseInt(process.env.PORT || '4001', 10);
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = basePort + attempt;
    try {
      await server.listen({ port, host: '0.0.0.0' });
      console.log(`Server running at http://localhost:${port}`);
      return;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'EADDRINUSE') {
        console.log(`Port ${port} in use, trying ${port + 1}...`);
        continue;
      }
      server.log.error(err);
      process.exit(1);
    }
  }

  console.error(`Could not find available port (tried ${basePort}-${basePort + maxAttempts - 1})`);
  process.exit(1);
};

start();
