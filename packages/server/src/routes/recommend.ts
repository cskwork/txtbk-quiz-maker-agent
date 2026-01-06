// 추천 생성 API 라우트
import type { FastifyInstance } from 'fastify';
import {
  generateRecommendations,
  generateRemediationQuestions,
  createDefaultTemplate,
  QuestionGenerationInputSchema,
  type QuestionGenerationInput,
  type RecommendationSet,
} from '@tqm/core';

// 요청 본문 타입
interface RecommendRequestBody {
  input: QuestionGenerationInput;
  targetAchievement?: string;
  learningGoal?: string;
}

interface RemediationRequestBody {
  input: QuestionGenerationInput;
  errorType: string;
}

// 응답 타입
interface RecommendResponse {
  success: boolean;
  recommendations: RecommendationSet;
  meta: {
    generatedAt: string;
    totalQuestions: number;
  };
}

export function registerRecommendRoutes(server: FastifyInstance): void {
  // POST /api/recommend - 추천 세트 생성
  server.post<{ Body: RecommendRequestBody }>(
    '/api/recommend',
    async (request, reply) => {
      try {
        const { input } = request.body;

        const parseResult = QuestionGenerationInputSchema.safeParse(input);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid input',
            details: parseResult.error.errors,
          });
        }

        const validInput = parseResult.data;
        const template = createDefaultTemplate(validInput.topic, validInput.grade);
        const recommendations = await generateRecommendations(validInput, template);

        const totalQuestions =
          recommendations.diagnostic.length +
          recommendations.practice.length +
          recommendations.variation.length +
          recommendations.extension.length;

        const response: RecommendResponse = {
          success: true,
          recommendations,
          meta: {
            generatedAt: new Date().toISOString(),
            totalQuestions,
          },
        };

        return reply.send(response);
      } catch (error) {
        server.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Recommendation generation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  // POST /api/recommend/remediation - 보강 문항 생성
  server.post<{ Body: RemediationRequestBody }>(
    '/api/recommend/remediation',
    async (request, reply) => {
      try {
        const { input, errorType } = request.body;

        const parseResult = QuestionGenerationInputSchema.safeParse(input);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid input',
            details: parseResult.error.errors,
          });
        }

        const template = createDefaultTemplate(parseResult.data.topic, parseResult.data.grade);
        const questions = await generateRemediationQuestions(
          parseResult.data,
          errorType,
          template,
        );

        return reply.send({
          success: true,
          questions,
          errorType,
          meta: {
            generatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        server.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Remediation generation failed',
        });
      }
    },
  );

  // GET /api/recommend/learning-path/:topic - 학습 경로 조회
  server.get<{ Params: { topic: string }; Querystring: { grade?: string } }>(
    '/api/recommend/learning-path/:topic',
    async (request, reply) => {
      try {
        const { topic } = request.params;
        const grade = request.query.grade || 'middle-1';

        const input: QuestionGenerationInput = {
          grade: grade as QuestionGenerationInput['grade'],
          subject: 'math',
          topic,
          questionCount: 1,
          questionType: 'multiple_choice',
          englishLevel: 'B1',
          difficulty: 'medium',
          curriculumVersion: '2022',
        };

        const template = createDefaultTemplate(topic, grade);
        const recommendations = await generateRecommendations(input, template);

        return reply.send({
          success: true,
          learningPath: recommendations.learningPath,
        });
      } catch (error) {
        server.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Learning path generation failed',
        });
      }
    },
  );
}
