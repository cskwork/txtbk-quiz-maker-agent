// 문항 생성 엔진
// 하이브리드 방식: 템플릿 기반 파라미터 샘플링 → 정답 계산 → 한국어/영어 표면화

import { v4 as uuidv4 } from 'uuid';
import * as math from 'mathjs';
import type {
  QuestionGenerationInput,
  GeneratedQuestion,
  QuestionTemplate,
  QuestionMetadata,
  Difficulty,
  CognitiveLevel,
  EnglishLevel,
} from '../types/index.js';
import { surfaceToEnglish, surfaceToKorean } from '../agent/index.js';

// 난이도별 파라미터 범위 조정 계수
const DIFFICULTY_MULTIPLIERS: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 0.3, max: 0.5 },
  medium: { min: 0.5, max: 0.8 },
  hard: { min: 0.8, max: 1.0 },
};

// 난이도별 인지 수준 분포
const COGNITIVE_LEVEL_DISTRIBUTION: Record<Difficulty, CognitiveLevel[]> = {
  easy: ['recall', 'recall', 'apply'],
  medium: ['apply', 'apply', 'reason'],
  hard: ['apply', 'reason', 'reason'],
};

// 랜덤 시드 생성기
function createSeededRandom(seed?: number): () => number {
  let s = seed ?? Math.floor(Math.random() * 1000000);
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

// 범위 내 정수 샘플링
function sampleInteger(
  min: number,
  max: number,
  random: () => number,
  step = 1,
): number {
  const range = Math.floor((max - min) / step) + 1;
  return min + Math.floor(random() * range) * step;
}

// 파라미터 샘플링
function sampleParameters(
  template: QuestionTemplate,
  difficulty: Difficulty,
  random: () => number,
): Record<string, number> {
  const multiplier = DIFFICULTY_MULTIPLIERS[difficulty];
  const params: Record<string, number> = {};

  for (const [varName, range] of Object.entries(template.mathSchema.variableRanges)) {
    const adjustedMin = Math.round(
      range.min + (range.max - range.min) * multiplier.min,
    );
    const adjustedMax = Math.round(
      range.min + (range.max - range.min) * multiplier.max,
    );
    params[varName] = sampleInteger(adjustedMin, adjustedMax, random, range.step);
  }

  return params;
}

// 수식 계산 (mathjs 사용)
function evaluateExpression(expression: string, params: Record<string, number>): number | string {
  try {
    const result = math.evaluate(expression, params);
    // 정수 결과면 정수로, 아니면 소수점 2자리까지
    if (Number.isInteger(result)) {
      return result;
    }
    return Math.round(result * 100) / 100;
  } catch {
    return 'Error in calculation';
  }
}

// 오답 생성 (대표 오류 패턴 기반)
function generateDistractors(
  template: QuestionTemplate,
  params: Record<string, number>,
  correctAnswer: number | string,
  random: () => number,
): string[] {
  const distractors: string[] = [];

  if (template.errorPatterns) {
    for (const pattern of template.errorPatterns) {
      try {
        const wrongAnswer = evaluateExpression(pattern.generator, params);
        if (wrongAnswer !== correctAnswer && !distractors.includes(String(wrongAnswer))) {
          distractors.push(String(wrongAnswer));
        }
      } catch {
        // 오류 패턴 적용 실패 시 무시
      }
    }
  }

  // 부족한 선지는 정답 근처 값으로 채움
  while (distractors.length < 3) {
    const offset = Math.floor(random() * 5) + 1;
    const sign = random() > 0.5 ? 1 : -1;
    const wrongAnswer = String(Number(correctAnswer) + offset * sign);
    if (!distractors.includes(wrongAnswer) && wrongAnswer !== String(correctAnswer)) {
      distractors.push(wrongAnswer);
    }
  }

  return distractors.slice(0, 3);
}

// 선지 섞기
function shuffleChoices(
  correctAnswer: string,
  distractors: string[],
  random: () => number,
): { choices: string[]; correctIndex: number } {
  const choices = [correctAnswer, ...distractors];
  
  // Fisher-Yates shuffle
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  const correctIndex = choices.indexOf(correctAnswer);
  const labels = ['A', 'B', 'C', 'D'];
  
  return {
    choices: choices.map((c, i) => `${labels[i]}) ${c}`),
    correctIndex,
  };
}

// 인지 수준 선택
function selectCognitiveLevel(
  difficulty: Difficulty,
  random: () => number,
): CognitiveLevel {
  const distribution = COGNITIVE_LEVEL_DISTRIBUTION[difficulty];
  return distribution[Math.floor(random() * distribution.length)];
}

// 템플릿 stem에 파라미터 대입
function interpolateStem(
  template: QuestionTemplate,
  params: Record<string, number>,
  englishLevel: EnglishLevel,
): string {
  const stemOptions = template.stemTemplates[englishLevel];
  if (!stemOptions || stemOptions.length === 0) {
    return '문제를 풀어주세요.';
  }

  // 랜덤 선택
  const stemTemplate = stemOptions[Math.floor(Math.random() * stemOptions.length)];

  // 파라미터 치환: ${a}, ${b}, ${c} 또는 {a}, {b}, {c} 형식
  return stemTemplate.replace(/\$?\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

// 한국어 풀이 단계 생성
function generateKoreanExplanation(
  template: QuestionTemplate,
  params: Record<string, number>,
  answer: number | string,
): string[] {
  // 일차방정식 형태
  if (template.solutionTemplate.includes('(c - b) / a')) {
    const { a, b, c } = params;
    return [
      `주어진 조건: $${a}x + ${b} = ${c}$`,
      `풀이: 양쪽에서 ${b}를 빼면 $${a}x = ${c - b}$`,
      `양변을 ${a}로 나누면 $x = ${answer}$`,
    ];
  }

  // 기본 연산
  const entries = Object.entries(params);
  return [
    `주어진 조건: ${entries.map(([k, v]) => `$${k} = ${v}$`).join(', ')}`,
    `계산: $${template.solutionTemplate}$`,
    `정답: $${answer}$`,
  ];
}

// 영어 풀이 단계 생성
function generateEnglishExplanation(
  template: QuestionTemplate,
  params: Record<string, number>,
  answer: number | string,
): string[] {
  return [
    `Given: ${Object.entries(params).map(([k, v]) => `$${k} = ${v}$`).join(', ')}`,
    `Apply: $${template.solutionTemplate}$`,
    `Calculate: $${answer}$`,
  ];
}

// 문항 1개 생성
async function generateSingleQuestion(
  input: QuestionGenerationInput,
  template: QuestionTemplate,
  questionIndex: number,
  baseSeed: number,
): Promise<GeneratedQuestion> {
  const seed = baseSeed + questionIndex;
  const random = createSeededRandom(seed);

  // 1. 파라미터 샘플링
  const params = sampleParameters(template, input.difficulty, random);

  // 2. 정답 계산
  const answer = evaluateExpression(template.solutionTemplate, params);

  // 3. 인지 수준 선택
  const cognitiveLevel = selectCognitiveLevel(input.difficulty, random);

  // 4. 지문 생성 - 과목에 따라 언어 결정 (LLM 사용)
  const isMathSubject = input.subject === '수학' || input.subject === 'Math' || input.subject.toLowerCase() === 'math';
  const mathStructure = {
    operation: template.topic,
    values: params,
    answer,
  };
  let stem: string;

  if (isMathSubject) {
    // 수학: Claude Agent SDK로 한국어 지문 생성
    stem = await surfaceToKorean(mathStructure);
  } else {
    // 영어: Claude Agent SDK로 영어 지문 생성
    stem = await surfaceToEnglish(mathStructure, input.englishLevel);
  }

  // 5. 선지 생성 (객관식인 경우)
  let choices: string[] | undefined;
  let displayAnswer = String(answer);

  if (input.questionType === 'multiple_choice') {
    const distractors = generateDistractors(template, params, answer, random);
    const shuffled = shuffleChoices(String(answer), distractors, random);
    choices = shuffled.choices;
    displayAnswer = ['A', 'B', 'C', 'D'][shuffled.correctIndex];
  }

  // 6. 풀이 단계 생성 - 과목에 따라 언어 결정
  const explanationSteps = isMathSubject
    ? generateKoreanExplanation(template, params, answer)
    : generateEnglishExplanation(template, params, answer);

  // 7. 메타데이터 구성
  const metadata: QuestionMetadata = {
    difficulty: input.difficulty,
    questionType: input.questionType,
    cognitiveLevel,
    englishLevel: input.englishLevel,
    seed,
    generatedAt: new Date().toISOString(),
  };

  return {
    id: uuidv4(),
    content: {
      stem,
      choices,
    },
    answer: displayAnswer,
    explanation: {
      steps: explanationSteps,
    },
    metadata,
  };
}

// 문항 배치 생성
export async function generateQuestions(
  input: QuestionGenerationInput,
  template: QuestionTemplate,
): Promise<GeneratedQuestion[]> {
  const baseSeed = input.seed ?? Math.floor(Math.random() * 1000000);
  const questions: GeneratedQuestion[] = [];

  for (let i = 0; i < input.questionCount; i++) {
    const question = await generateSingleQuestion(input, template, i, baseSeed);
    questions.push(question);
  }

  return questions;
}

// 기본 템플릿 생성 (템플릿이 없을 때 사용)
export function createDefaultTemplate(
  topic: string,
  grade: string,
): QuestionTemplate {
  return {
    id: `default-${topic}`,
    topic,
    grade: grade as QuestionTemplate['grade'],
    questionType: 'multiple_choice',
    mathSchema: {
      variableRanges: {
        a: { min: 1, max: 20 },
        b: { min: 1, max: 20 },
      },
    },
    solutionTemplate: 'a + b', // 기본: 덧셈
    errorPatterns: [
      {
        name: 'subtraction-instead',
        description: '덧셈 대신 뺄셈',
        generator: 'a - b',
      },
      {
        name: 'off-by-one',
        description: '1 차이 오류',
        generator: 'a + b + 1',
      },
    ],
    stemTemplates: {
      A1: ['What is {a} plus {b}?'],
      A2: ['Calculate {a} + {b}.'],
      B1: ['Find the sum of {a} and {b}.'],
      B2: ['Determine the result of adding {a} to {b}.'],
    },
  };
}
