import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentMessage } from './types.js';

// SDK 모킹
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

describe('runAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should yield text messages from assistant responses', async () => {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const { runAgent } = await import('./index.js');

    (query as ReturnType<typeof vi.fn>).mockReturnValue(
      (async function* () {
        yield { type: 'system', subtype: 'init', session_id: 'test-123' };
        yield { type: 'assistant', content: 'Hello, world!' };
        yield { type: 'system', subtype: 'completion' };
      })()
    );

    const messages: AgentMessage[] = [];
    for await (const msg of runAgent('test prompt')) {
      messages.push(msg);
    }

    expect(messages).toHaveLength(3);
    expect(messages[0].type).toBe('system');
    expect(messages[0].sessionId).toBe('test-123');
    expect(messages[1].type).toBe('text');
    expect(messages[1].content).toBe('Hello, world!');
    expect(messages[2].type).toBe('system');
    expect(messages[2].content).toBe('Task completed');
  });

  it('should handle content blocks array', async () => {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const { runAgent } = await import('./index.js');

    (query as ReturnType<typeof vi.fn>).mockReturnValue(
      (async function* () {
        yield {
          type: 'assistant',
          content: [
            { type: 'text', text: 'Part 1' },
            { type: 'text', text: ' Part 2' },
          ],
        };
      })()
    );

    const messages: AgentMessage[] = [];
    for await (const msg of runAgent('test prompt')) {
      messages.push(msg);
    }

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Part 1 Part 2');
  });

  it('should handle errors gracefully', async () => {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const { runAgent } = await import('./index.js');

    (query as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limited' };
    });

    const messages: AgentMessage[] = [];
    for await (const msg of runAgent('test prompt')) {
      messages.push(msg);
    }

    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('error');
    expect(messages[0].metadata?.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should yield error messages from SDK', async () => {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const { runAgent } = await import('./index.js');

    (query as ReturnType<typeof vi.fn>).mockReturnValue(
      (async function* () {
        yield {
          type: 'error',
          error: { type: 'permission_denied', message: 'Access denied', tool: 'Bash' },
        };
      })()
    );

    const messages: AgentMessage[] = [];
    for await (const msg of runAgent('test prompt')) {
      messages.push(msg);
    }

    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('error');
    expect(messages[0].content).toBe('Access denied');
  });
});

describe('generateQuestionsWithAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse JSON array from response', async () => {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const { generateQuestionsWithAgent } = await import('./index.js');

    const mockQuestions = [
      {
        stem: 'What is 5 + 3?',
        choices: ['A) 6', 'B) 7', 'C) 8', 'D) 9'],
        answer: 'C',
        explanation: { steps: ['5 + 3 = 8'] },
        cognitiveLevel: 'recall',
      },
    ];

    (query as ReturnType<typeof vi.fn>).mockReturnValue(
      (async function* () {
        yield { type: 'assistant', content: JSON.stringify(mockQuestions) };
      })()
    );

    const result = await generateQuestionsWithAgent({
      grade: 'elementary-3-4',
      subject: 'Math',
      topic: 'Addition',
      questionCount: 1,
      questionType: 'multiple_choice',
      englishLevel: 'A1',
      difficulty: 'easy',
      curriculumVersion: '2022',
    });

    expect(result).toHaveLength(1);
    expect(result[0].content.stem).toBe('What is 5 + 3?');
    expect(result[0].answer).toBe('C');
    expect(result[0].metadata.difficulty).toBe('easy');
  });

  it('should handle JSON in code blocks', async () => {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const { generateQuestionsWithAgent } = await import('./index.js');

    (query as ReturnType<typeof vi.fn>).mockReturnValue(
      (async function* () {
        yield {
          type: 'assistant',
          content: '```json\n[{"stem":"Test question?","answer":"A","explanation":{"steps":["Step 1"]}}]\n```',
        };
      })()
    );

    const result = await generateQuestionsWithAgent({
      grade: 'elementary-3-4',
      subject: 'Math',
      topic: 'Test',
      questionCount: 1,
      questionType: 'multiple_choice',
      englishLevel: 'A1',
      difficulty: 'easy',
      curriculumVersion: '2022',
    });

    expect(result).toHaveLength(1);
    expect(result[0].content.stem).toBe('Test question?');
  });

  it('should return empty array on parse failure', async () => {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const { generateQuestionsWithAgent } = await import('./index.js');

    (query as ReturnType<typeof vi.fn>).mockReturnValue(
      (async function* () {
        yield { type: 'assistant', content: 'This is not valid JSON' };
      })()
    );

    const result = await generateQuestionsWithAgent({
      grade: 'elementary-3-4',
      subject: 'Math',
      topic: 'Test',
      questionCount: 1,
      questionType: 'multiple_choice',
      englishLevel: 'A1',
      difficulty: 'easy',
      curriculumVersion: '2022',
    });

    expect(result).toHaveLength(0);
  });
});

describe('surfaceToEnglish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return LLM-generated stem', async () => {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const { surfaceToEnglish } = await import('./index.js');

    (query as ReturnType<typeof vi.fn>).mockReturnValue(
      (async function* () {
        yield { type: 'assistant', content: 'What is the sum of 5 and 3?' };
      })()
    );

    const result = await surfaceToEnglish(
      { operation: 'addition', values: { a: 5, b: 3 }, answer: 8 },
      'B1'
    );

    expect(result).toBe('What is the sum of 5 and 3?');
  });

  it('should fallback on empty response', async () => {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const { surfaceToEnglish } = await import('./index.js');

    (query as ReturnType<typeof vi.fn>).mockReturnValue(
      (async function* () {
        yield { type: 'assistant', content: '' };
      })()
    );

    const result = await surfaceToEnglish(
      { operation: 'addition', values: { a: 5, b: 3 }, answer: 8 },
      'A1'
    );

    expect(result).toContain('5');
    expect(result).toContain('3');
    expect(result).toContain('plus');
  });

  it('should fallback on JSON response', async () => {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const { surfaceToEnglish } = await import('./index.js');

    (query as ReturnType<typeof vi.fn>).mockReturnValue(
      (async function* () {
        yield { type: 'assistant', content: '{"stem": "Wrong format"}' };
      })()
    );

    const result = await surfaceToEnglish(
      { operation: 'subtraction', values: { a: 10, b: 4 }, answer: 6 },
      'A2'
    );

    // 폴백 결과에 숫자 포함 확인
    expect(result).toContain('10');
    expect(result).toContain('4');
  });

  it('should fallback on error', async () => {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const { surfaceToEnglish } = await import('./index.js');

    (query as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Network error');
    });

    const result = await surfaceToEnglish(
      { operation: 'addition', values: { x: 7, y: 2 }, answer: 9 },
      'B2'
    );

    // 폴백이 작동해야 함
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('extractJSON helper (via generateQuestionsWithAgent)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract JSON from markdown code block without language', async () => {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const { generateQuestionsWithAgent } = await import('./index.js');

    (query as ReturnType<typeof vi.fn>).mockReturnValue(
      (async function* () {
        yield {
          type: 'assistant',
          content: '```\n[{"stem":"No lang tag","answer":"B"}]\n```',
        };
      })()
    );

    const result = await generateQuestionsWithAgent({
      grade: 'middle-1',
      subject: 'Math',
      topic: 'Test',
      questionCount: 1,
      questionType: 'short_answer',
      englishLevel: 'B1',
      difficulty: 'medium',
      curriculumVersion: '2022',
    });

    expect(result).toHaveLength(1);
  });

  it('should handle single object response', async () => {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const { generateQuestionsWithAgent } = await import('./index.js');

    (query as ReturnType<typeof vi.fn>).mockReturnValue(
      (async function* () {
        yield {
          type: 'assistant',
          content: '{"stem":"Single question","answer":"42","explanation":{"steps":[]}}',
        };
      })()
    );

    const result = await generateQuestionsWithAgent({
      grade: 'high-1',
      subject: 'Math',
      topic: 'Algebra',
      questionCount: 1,
      questionType: 'short_answer',
      englishLevel: 'B2',
      difficulty: 'hard',
      curriculumVersion: '2022',
    });

    expect(result).toHaveLength(1);
    expect(result[0].content.stem).toBe('Single question');
  });
});
