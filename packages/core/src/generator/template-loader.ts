// 템플릿 로더
// 주제별 템플릿 파일을 로드하고 기본 템플릿을 제공

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { QuestionTemplate, Grade, EnglishLevel } from '../types/index.js';

// 한국어 주제 → 템플릿 ID 매핑
const TOPIC_TO_TEMPLATE_ID: Record<string, string> = {
  // 방정식
  '일차방정식': 'linear-equation-basic',
  '연립방정식': 'system-of-equations',
  '이차방정식': 'quadratic-equation',
  // 분수
  '분수의 개념': 'fraction-concept',
  '분수의 덧셈': 'fraction-addition',
  '분수의 나눗셈': 'fraction-division',
  // 기본 연산
  '덧셈': 'addition-basic',
  '뺄셈': 'subtraction-basic',
  '곱셈': 'multiplication-basic',
  '나눗셈': 'division-basic',
};

// 템플릿 디렉토리 경로 (monorepo 루트 기준)
function getTemplateDir(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  // packages/core/src/generator -> ../../../../data/templates
  return join(__dirname, '..', '..', '..', '..', 'data', 'templates');
}

// JSON 파일에서 템플릿 로드
function loadTemplateFromFile(templateId: string): QuestionTemplate | null {
  const templateDir = getTemplateDir();
  const filePath = join(templateDir, `${templateId}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as QuestionTemplate;
  } catch (error) {
    console.warn(`템플릿 로드 실패: ${filePath}`, error);
    return null;
  }
}

// 기본 템플릿 생성 (폴백용)
export function createDefaultTemplate(
  topic: string,
  grade: string,
): QuestionTemplate {
  // 일차방정식 계열 기본 템플릿
  if (topic.includes('방정식')) {
    return {
      id: `default-${topic}`,
      topic,
      grade: grade as Grade,
      questionType: 'multiple_choice',
      mathSchema: {
        variableRanges: {
          a: { min: 2, max: 10 },
          b: { min: 1, max: 20 },
          c: { min: 5, max: 50 },
        },
        constraints: ['(c - b) % a === 0'],
      },
      solutionTemplate: '(c - b) / a',
      errorPatterns: [
        {
          name: 'sign-error',
          description: '부호 실수',
          generator: '(c + b) / a',
        },
        {
          name: 'no-division',
          description: '나눗셈 생략',
          generator: 'c - b',
        },
      ],
      stemTemplates: {
        A1: ['$x$를 구하세요: ${a}x + ${b} = ${c}'],
        A2: ['방정식을 풀어 $x$의 값을 구하세요: ${a}x + ${b} = ${c}'],
        B1: ['일차방정식 ${a}x + ${b} = ${c}를 풀어 $x$의 값을 구하세요.'],
        B2: ['일차방정식 ${a}x + ${b} = ${c}에서 미지수 $x$의 값을 구하세요.'],
      },
    };
  }

  // 덧셈 기본 템플릿
  return {
    id: `default-${topic}`,
    topic,
    grade: grade as Grade,
    questionType: 'multiple_choice',
    mathSchema: {
      variableRanges: {
        a: { min: 1, max: 20 },
        b: { min: 1, max: 20 },
      },
    },
    solutionTemplate: 'a + b',
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
      A1: ['${a} + ${b}의 값은?'],
      A2: ['${a} + ${b}를 계산하세요.'],
      B1: ['${a}와 ${b}의 합을 구하세요.'],
      B2: ['두 수 ${a}와 ${b}를 더한 결과를 구하세요.'],
    },
  };
}

// 주제에 맞는 템플릿 로드
export function loadTemplate(topic: string, grade: string): QuestionTemplate {
  // 1. 매핑된 템플릿 ID 찾기
  const templateId = TOPIC_TO_TEMPLATE_ID[topic];

  if (templateId) {
    // 2. 파일에서 로드 시도
    const fileTemplate = loadTemplateFromFile(templateId);
    if (fileTemplate) {
      return fileTemplate;
    }
  }

  // 3. 기본 템플릿으로 폴백
  console.warn(`템플릿 없음, 기본값 사용: topic=${topic}`);
  return createDefaultTemplate(topic, grade);
}
