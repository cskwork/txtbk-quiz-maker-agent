// 문항 생성 API 라우트
import type { FastifyInstance } from 'fastify';
import {
  generateQuestions,
  createDefaultTemplate,
  validateQuestions,
  QuestionGenerationInputSchema,
  type QuestionGenerationInput,
  type GeneratedQuestion,
} from '@tqm/core';

// 요청 본문 타입
interface GenerateRequestBody {
  input: QuestionGenerationInput;
}

// 응답 타입
interface GenerateResponse {
  success: boolean;
  questions: GeneratedQuestion[];
  validation: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
  meta: {
    generatedAt: string;
    seed?: number;
  };
}

export function registerGenerateRoutes(server: FastifyInstance): void {
  // POST /api/generate - 즉시 생성
  server.post<{ Body: GenerateRequestBody }>(
    '/api/generate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['input'],
          properties: {
            input: {
              type: 'object',
              properties: {
                grade: { type: 'string' },
                subject: { type: 'string' },
                topic: { type: 'string' },
                questionCount: { type: 'number' },
                questionType: { type: 'string' },
                englishLevel: { type: 'string' },
                difficulty: { type: 'string' },
                curriculumVersion: { type: 'string' },
                seed: { type: 'number' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // 입력 검증
        const parseResult = QuestionGenerationInputSchema.safeParse(request.body.input);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid input',
            details: parseResult.error.errors,
          });
        }

        const input = parseResult.data;

        // 템플릿 로드 (현재는 기본 템플릿 사용)
        const template = createDefaultTemplate(input.topic, input.grade);

        // 문항 생성
        const questions = await generateQuestions(input, template);

        // 검증
        const validationResult = validateQuestions(questions);

        const response: GenerateResponse = {
          success: true,
          questions,
          validation: validationResult.summary,
          meta: {
            generatedAt: new Date().toISOString(),
            seed: input.seed,
          },
        };

        return reply.send(response);
      } catch (error) {
        server.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Generation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  // POST /api/generate/single - 단일 문항 재생성
  server.post<{ Body: { input: QuestionGenerationInput; partialRegenerate?: 'stem' | 'choices' | 'values' } }>(
    '/api/generate/single',
    async (request, reply) => {
      try {
        const { input, partialRegenerate } = request.body;

        const parseResult = QuestionGenerationInputSchema.safeParse({
          ...input,
          questionCount: 1,
        });

        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid input',
            details: parseResult.error.errors,
          });
        }

        const template = createDefaultTemplate(parseResult.data.topic, parseResult.data.grade);
        const questions = await generateQuestions(parseResult.data, template);

        // TODO: partialRegenerate 옵션에 따라 부분 재생성 구현
        // - 'stem': 지문만 재생성
        // - 'choices': 선지만 재생성
        // - 'values': 수치만 변경

        return reply.send({
          success: true,
          question: questions[0],
        });
      } catch (error) {
        server.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Generation failed',
        });
      }
    },
  );
}
