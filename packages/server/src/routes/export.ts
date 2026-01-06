// 내보내기 API 라우트
import type { FastifyInstance } from 'fastify';
import type { GeneratedQuestion } from '@tqm/core';

// 요청 본문 타입
interface ExportRequestBody {
  questions: GeneratedQuestion[];
  format: 'docx' | 'pdf' | 'json';
  options?: {
    includeAnswers?: boolean;
    includeExplanations?: boolean;
    title?: string;
  };
}

// 간단한 텍스트 형식 생성 (POC용)
function generateTextFormat(
  questions: GeneratedQuestion[],
  options: ExportRequestBody['options'] = {},
): string {
  const { includeAnswers = true, includeExplanations = true, title = '문항 모음' } = options;

  let text = `${title}\n${'='.repeat(title.length)}\n\n`;

  questions.forEach((q, index) => {
    text += `${index + 1}. ${q.content.stem}\n`;

    if (q.content.choices) {
      q.content.choices.forEach((choice: string) => {
        text += `   ${choice}\n`;
      });
    }

    text += '\n';

    if (includeAnswers) {
      text += `정답: ${q.answer}\n`;
    }

    if (includeExplanations && q.explanation.steps.length > 0) {
      text += '해설:\n';
      q.explanation.steps.forEach((step: string) => {
        text += `  ${step}\n`;
      });
    }

    text += '\n---\n\n';
  });

  return text;
}

export function registerExportRoutes(server: FastifyInstance): void {
  // POST /api/export - 문항 내보내기
  server.post<{ Body: ExportRequestBody }>(
    '/api/export',
    async (request, reply) => {
      try {
        const { questions, format, options } = request.body;

        if (!questions || questions.length === 0) {
          return reply.status(400).send({
            success: false,
            error: 'No questions provided',
          });
        }

        switch (format) {
          case 'docx':
          case 'pdf': {
            // POC 단계: 텍스트 형식으로 대체
            const text = generateTextFormat(questions, options);
            return reply
              .header('Content-Type', 'text/plain; charset=utf-8')
              .header('Content-Disposition', `attachment; filename="questions.txt"`)
              .send(text);
          }

          case 'json':
          default: {
            return reply
              .header('Content-Type', 'application/json')
              .header('Content-Disposition', 'attachment; filename="questions.json"')
              .send({
                exportedAt: new Date().toISOString(),
                questionCount: questions.length,
                questions,
              });
          }
        }
      } catch (error) {
        server.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Export failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );
}
