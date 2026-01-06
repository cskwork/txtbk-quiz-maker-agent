// Claude Agent SDK 래퍼
// 문항 생성을 위한 에이전트 인터페이스

import { query } from '@anthropic-ai/claude-agent-sdk';
import { v4 as uuidv4 } from 'uuid';
import type {
  QuestionGenerationInput,
  GeneratedQuestion,
  QuestionTemplate,
  EnglishLevel,
} from '../types/index.js';
import type {
  AgentMessage,
  AgentQueryOptions,
  SDKMessage,
  AgentErrorCode,
} from './types.js';
import { AgentError } from './types.js';

// Re-export types
export type { AgentMessage, AgentQueryOptions, AgentErrorCode } from './types.js';
export { AgentError } from './types.js';

// 영어 수준별 가이드라인
const ENGLISH_LEVEL_GUIDELINES: Record<EnglishLevel, string> = {
  A1: `
    - Use simple present tense only
    - Short sentences (max 10 words)
    - Basic vocabulary (numbers, add, subtract, multiply, divide, equal)
    - Avoid complex structures
  `,
  A2: `
    - Simple present and past tense
    - Sentences up to 15 words
    - Common mathematical vocabulary
    - Simple conditionals (if... then...)
  `,
  B1: `
    - Various tenses as appropriate
    - Sentences up to 20 words
    - Standard mathematical vocabulary
    - Compound sentences allowed
  `,
  B2: `
    - Full range of tenses
    - Complex sentences allowed
    - Advanced mathematical vocabulary
    - Abstract concepts permitted
  `,
};

// 시스템 프롬프트 생성
function buildSystemPrompt(input: QuestionGenerationInput): string {
  return `You are a mathematics question generator for Korean educational curriculum.
Your task is to generate high-quality math questions in English.

## Guidelines

### Language Level: ${input.englishLevel}
${ENGLISH_LEVEL_GUIDELINES[input.englishLevel]}

### Question Requirements
- Grade: ${input.grade}
- Subject: ${input.subject}
- Topic: ${input.topic}
- Type: ${input.questionType}
- Difficulty: ${input.difficulty}
- Curriculum Version: ${input.curriculumVersion}

### Output Format
Generate questions in the following JSON format:
{
  "stem": "The question text...",
  "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], // for multiple choice only
  "answer": "correct answer",
  "explanation": {
    "steps": ["Step 1: ...", "Step 2: ...", "Final answer: ..."]
  },
  "cognitiveLevel": "recall" | "apply" | "reason"
}

### Important Rules
1. ALWAYS calculate the correct answer FIRST
2. Ensure mathematical accuracy
3. Use appropriate vocabulary for the English level
4. For multiple choice: include common error patterns as distractors
5. Provide clear, step-by-step explanations
`;
}

// 문항 생성 프롬프트
function buildGenerationPrompt(
  input: QuestionGenerationInput,
  template?: QuestionTemplate,
): string {
  let prompt = `Generate ${input.questionCount} ${input.questionType} question(s) about "${input.topic}".

Difficulty: ${input.difficulty}
`;

  if (template) {
    prompt += `
Use the following template constraints:
- Variable ranges: ${JSON.stringify(template.mathSchema.variableRanges)}
- Constraints: ${template.mathSchema.constraints?.join(', ') || 'none'}
`;

    if (template.errorPatterns && input.questionType === 'multiple_choice') {
      prompt += `
Generate distractors using these common error patterns:
${template.errorPatterns.map((e) => `- ${e.name}: ${e.description}`).join('\n')}
`;
    }
  }

  prompt += `
Return a JSON array of questions. Each question must have:
- Unique, well-formed mathematical content
- Verified correct answer
- Clear explanation steps
`;

  return prompt;
}

// SDK 메시지에서 텍스트 추출 헬퍼
function extractTextContent(message: SDKMessage): string | null {
  if (message.type !== 'assistant') return null;

  if (typeof message.content === 'string') {
    return message.content;
  }

  // 콘텐츠 블록 배열 처리
  return message.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

// 에러 코드 매핑 헬퍼
function mapErrorCode(error: unknown): AgentErrorCode {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    switch (code) {
      case 'AUTHENTICATION_FAILED':
      case 'RATE_LIMIT_EXCEEDED':
      case 'CONTEXT_LENGTH_EXCEEDED':
        return code as AgentErrorCode;
      default:
        return 'UNKNOWN_ERROR';
    }
  }
  return 'UNKNOWN_ERROR';
}

// Agent 실행 (실제 SDK 연동)
export async function* runAgent(
  prompt: string,
  options: AgentQueryOptions = {},
): AsyncGenerator<AgentMessage> {
  try {
    const response = query({
      prompt,
      options: {
        model: options.model ?? 'claude-sonnet-4-5',
        systemPrompt: options.systemPrompt,
        permissionMode: options.permissionMode ?? 'plan',
        maxBudgetUsd: options.maxBudgetUsd ?? 1.0,
        allowedTools: options.allowedTools ?? [],
        ...(options.resume && { resume: options.resume }),
        ...(options.forkSession && { forkSession: options.forkSession }),
      },
    });

    let currentSessionId: string | undefined;

    for await (const message of response) {
      const sdkMessage = message as SDKMessage;

      switch (sdkMessage.type) {
        case 'system':
          if (sdkMessage.subtype === 'init') {
            currentSessionId = sdkMessage.session_id;
            yield {
              type: 'system',
              content: `Session initialized: ${sdkMessage.session_id}`,
              sessionId: sdkMessage.session_id,
            };
          } else if (sdkMessage.subtype === 'completion') {
            yield {
              type: 'system',
              content: 'Task completed',
              sessionId: currentSessionId,
            };
          }
          break;

        case 'assistant':
          const textContent = extractTextContent(sdkMessage);
          if (textContent) {
            yield {
              type: 'text',
              content: textContent,
              sessionId: currentSessionId,
            };
          }
          break;

        case 'tool_call':
          yield {
            type: 'tool_use',
            content: `Tool: ${sdkMessage.tool_name}`,
            sessionId: currentSessionId,
            metadata: { toolName: sdkMessage.tool_name, input: sdkMessage.input },
          };
          break;

        case 'tool_result':
          yield {
            type: 'tool_result',
            content: sdkMessage.result,
            sessionId: currentSessionId,
            metadata: { toolName: sdkMessage.tool_name },
          };
          break;

        case 'error':
          yield {
            type: 'error',
            content: sdkMessage.error.message,
            sessionId: currentSessionId,
            metadata: { errorType: sdkMessage.error.type },
          };
          break;
      }
    }
  } catch (error) {
    const errorCode = mapErrorCode(error);
    yield {
      type: 'error',
      content: error instanceof Error ? error.message : 'Unknown error',
      metadata: { code: errorCode },
    };
  }
}

// JSON 추출 헬퍼 함수
function extractJSON(text: string): unknown | null {
  // 코드 블록 내 JSON 추출
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // 계속 진행
    }
  }

  // 배열 또는 객체 직접 추출
  const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // 계속 진행
    }
  }

  return null;
}

// 문항 생성 에이전트
export async function generateQuestionsWithAgent(
  input: QuestionGenerationInput,
  template?: QuestionTemplate,
): Promise<GeneratedQuestion[]> {
  const systemPrompt = buildSystemPrompt(input);
  const userPrompt = buildGenerationPrompt(input, template);

  const collectedContent: string[] = [];
  let lastError: string | null = null;

  try {
    for await (const message of runAgent(userPrompt, {
      systemPrompt,
      allowedTools: [],
      permissionMode: 'plan',
      maxBudgetUsd: 0.5,
    })) {
      if (message.type === 'text') {
        collectedContent.push(message.content);
      } else if (message.type === 'error') {
        lastError = message.content;
      }
    }

    const fullResponse = collectedContent.join('');

    if (!fullResponse && lastError) {
      throw new AgentError(`Agent returned error: ${lastError}`, 'UNKNOWN_ERROR');
    }

    const parsed = extractJSON(fullResponse);

    if (!parsed) {
      console.warn('Failed to parse JSON from response:', fullResponse.slice(0, 200));
      return [];
    }

    // 배열 또는 단일 객체 처리
    const rawQuestions = Array.isArray(parsed) ? parsed : [parsed];

    // GeneratedQuestion 형식으로 변환
    return rawQuestions.map((q: Record<string, unknown>) => ({
      id: uuidv4(),
      content: {
        stem: (q.stem as string) || '',
        choices: q.choices as string[] | undefined,
        imageDescription: q.imageDescription as string | undefined,
      },
      answer: (q.answer as string | number) || '',
      explanation: {
        steps: (q.explanation as { steps?: string[] })?.steps || [],
      },
      metadata: {
        difficulty: input.difficulty,
        questionType: input.questionType,
        cognitiveLevel: (q.cognitiveLevel as 'recall' | 'apply' | 'reason') || 'apply',
        englishLevel: input.englishLevel,
        generatedAt: new Date().toISOString(),
      },
    }));
  } catch (error) {
    if (error instanceof AgentError) {
      throw error;
    }
    throw new AgentError(
      error instanceof Error ? error.message : 'Question generation failed',
      'UNKNOWN_ERROR',
      error
    );
  }
}

// 한국어 주제를 영어 연산으로 매핑
const TOPIC_TO_OPERATION: Record<string, string> = {
  // 기본 연산
  '한 자리 수 덧셈': 'addition',
  '두 자리 수 덧셈': 'addition',
  '덧셈': 'addition',
  '한 자리 수 뺄셈': 'subtraction',
  '두 자리 수 뺄셈': 'subtraction',
  '뺄셈': 'subtraction',
  '곱셈': 'multiplication',
  '곱셈구구': 'multiplication',
  '나눗셈': 'division',
  // 분수
  '분수의 개념': 'fraction',
  '분수의 덧셈': 'fraction addition',
  '분수의 나눗셈': 'fraction division',
  // 소수
  '소수의 곱셈': 'decimal multiplication',
  // 비율
  '비와 비율': 'ratio',
  // 방정식
  '정수와 유리수': 'integer operations',
  '일차방정식': 'linear equation',
  '연립방정식': 'system of equations',
  '이차방정식': 'quadratic equation',
  // 함수
  '일차함수': 'linear function',
  '이차함수': 'quadratic function',
  '좌표평면': 'coordinate plane',
  // 부등식
  '부등식': 'inequality',
  // 기타
  '집합': 'set theory',
  '명제': 'proposition',
  '함수': 'function',
  '수열': 'sequence',
  '지수와 로그': 'exponents and logarithms',
  '삼각함수': 'trigonometric functions',
  '미분': 'differentiation',
  '적분': 'integration',
  '확률과 통계': 'probability and statistics',
  '피타고라스 정리': 'pythagorean theorem',
  '두 자리 수 이해': 'two-digit numbers',
};

// 솔루션 템플릿에서 연산 추론
function inferOperationFromTemplate(solutionTemplate: string): string {
  const template = solutionTemplate.toLowerCase().trim();
  if (template.includes('+')) return 'addition';
  if (template.includes('-')) return 'subtraction';
  if (template.includes('*') || template.includes('×')) return 'multiplication';
  if (template.includes('/') || template.includes('÷')) return 'division';
  return 'calculation';
}

// 연산에 따른 영어 표현 생성
function getOperationText(operation: string): { verb: string; symbol: string; preposition: string } {
  switch (operation) {
    case 'addition':
      return { verb: 'plus', symbol: '+', preposition: 'added to' };
    case 'subtraction':
      return { verb: 'minus', symbol: '-', preposition: 'subtracted from' };
    case 'multiplication':
      return { verb: 'times', symbol: '×', preposition: 'multiplied by' };
    case 'division':
      return { verb: 'divided by', symbol: '÷', preposition: 'divided by' };
    default:
      return { verb: 'and', symbol: '+', preposition: 'combined with' };
  }
}

// Fallback 지문 생성
function generateFallbackStem(
  mathStructure: { operation: string; values: Record<string, number>; answer: number | string },
  englishLevel: EnglishLevel
): string {
  const { values, operation: rawOperation } = mathStructure;
  const vars = Object.entries(values);

  // 한국어 주제를 영어 연산으로 변환
  const operation = TOPIC_TO_OPERATION[rawOperation] || inferOperationFromTemplate(rawOperation);
  const opText = getOperationText(operation);

  if (vars.length >= 2) {
    const [[, a], [, b]] = vars;
    switch (englishLevel) {
      case 'A1':
        return `What is ${a} ${opText.verb} ${b}?`;
      case 'A2':
        return `Calculate ${a} ${opText.symbol} ${b}.`;
      case 'B1':
        return `Find the result of ${a} ${opText.symbol} ${b}.`;
      case 'B2':
        return `Determine the value when ${a} is ${opText.preposition} ${b}.`;
    }
  }

  return 'Calculate the answer.';
}

// 영어 표면화 에이전트
export async function surfaceToEnglish(
  mathStructure: {
    operation: string;
    values: Record<string, number>;
    answer: number | string;
  },
  englishLevel: EnglishLevel,
): Promise<string> {
  const prompt = `Convert this mathematical structure to an English question:
Structure: ${JSON.stringify(mathStructure)}
English Level: ${englishLevel}
${ENGLISH_LEVEL_GUIDELINES[englishLevel]}

Return ONLY the question text in English, no JSON or additional formatting.
Do not include the answer in the question.`;

  const collectedContent: string[] = [];

  try {
    for await (const message of runAgent(prompt, {
      permissionMode: 'plan',
      allowedTools: [],
      maxBudgetUsd: 0.1,
    })) {
      if (message.type === 'text') {
        collectedContent.push(message.content);
      }
    }

    const result = collectedContent.join('').trim();

    // 유효성 검증: 빈 응답 또는 JSON 형식 감지
    if (!result || result.startsWith('{') || result.startsWith('[')) {
      return generateFallbackStem(mathStructure, englishLevel);
    }

    return result;
  } catch (error) {
    console.warn('surfaceToEnglish failed, using fallback:', error);
    return generateFallbackStem(mathStructure, englishLevel);
  }
}
