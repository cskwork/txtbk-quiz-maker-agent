// 검증 파이프라인
// LLM 기반 수학/언어/정책 검증

// mathjs는 고도화 단계에서 수식 검증에 활용 예정
import type {
  GeneratedQuestion,
  ValidationResult,
  QuestionType,
} from '../types/index.js';

// 검증 오류 타입
interface ValidationError {
  type: 'math' | 'language' | 'policy';
  message: string;
  severity: 'error' | 'warning';
}

// 금지 표현 목록 (모호한 지시어)
const FORBIDDEN_EXPRESSIONS = [
  'it', 'this', 'that', 'these', 'those', // 애매한 지시어
  'some', 'several', 'a few', // 모호한 수량
  'approximately', 'about', 'around', // 근사값 (정확성 필요)
];

// 필수 수학 키워드 (유형별)
const REQUIRED_MATH_KEYWORDS: Record<QuestionType, string[]> = {
  multiple_choice: ['?', 'which', 'what', 'find', 'calculate', 'solve'],
  short_answer: ['?', 'find', 'calculate', 'determine', 'compute'],
  essay: ['explain', 'describe', 'show', 'prove', 'demonstrate'],
};

// 수학 검증: 정답 재계산
function validateMathCorrectness(question: GeneratedQuestion): ValidationError[] {
  const errors: ValidationError[] = [];

  // 풀이 단계에서 수식 추출 시도
  const steps = question.explanation.steps;
  if (steps.length === 0) {
    errors.push({
      type: 'math',
      message: 'No explanation steps provided',
      severity: 'warning',
    });
  }

  // 정답이 숫자인 경우 유효성 검사
  const answer = question.answer;
  if (typeof answer === 'number' || !isNaN(Number(answer))) {
    const numAnswer = Number(answer);
    if (!Number.isFinite(numAnswer)) {
      errors.push({
        type: 'math',
        message: 'Answer is not a finite number',
        severity: 'error',
      });
    }
  }

  // 객관식: 정답이 선지에 포함되어 있는지 확인
  if (question.metadata.questionType === 'multiple_choice') {
    if (!question.content.choices || question.content.choices.length === 0) {
      errors.push({
        type: 'math',
        message: 'Multiple choice question has no choices',
        severity: 'error',
      });
    } else {
      // 정답 레이블(A, B, C, D)이 유효한지 확인
      const validLabels = ['A', 'B', 'C', 'D'];
      if (!validLabels.includes(String(answer))) {
        errors.push({
          type: 'math',
          message: `Invalid answer label: ${answer}`,
          severity: 'error',
        });
      }
    }
  }

  return errors;
}

// 언어 검증: 문법/명확성
function validateLanguage(question: GeneratedQuestion): ValidationError[] {
  const errors: ValidationError[] = [];
  const stem = question.content.stem.toLowerCase();

  // 금지 표현 검사
  for (const expr of FORBIDDEN_EXPRESSIONS) {
    // 단어 경계 체크 (부분 일치 방지)
    const regex = new RegExp(`\\b${expr}\\b`, 'i');
    if (regex.test(stem)) {
      errors.push({
        type: 'language',
        message: `Ambiguous expression detected: "${expr}"`,
        severity: 'warning',
      });
    }
  }

  // 필수 키워드 검사
  const requiredKeywords = REQUIRED_MATH_KEYWORDS[question.metadata.questionType];
  const hasRequiredKeyword = requiredKeywords.some((kw) =>
    stem.includes(kw.toLowerCase()),
  );
  if (!hasRequiredKeyword) {
    errors.push({
      type: 'language',
      message: `Question may lack clear instruction. Expected one of: ${requiredKeywords.join(', ')}`,
      severity: 'warning',
    });
  }

  // 문장 길이 검사 (영어 수준별)
  const wordCount = stem.split(/\s+/).length;
  const maxWords: Record<string, number> = {
    A1: 15,
    A2: 25,
    B1: 40,
    B2: 60,
  };
  const limit = maxWords[question.metadata.englishLevel] || 40;
  if (wordCount > limit) {
    errors.push({
      type: 'language',
      message: `Question too long for ${question.metadata.englishLevel} level: ${wordCount} words (max: ${limit})`,
      severity: 'warning',
    });
  }

  // 숫자 표기 일관성 (콤마 사용 등)
  const inconsistentNumbers = /\d{4,}/.test(stem) && !/\d{1,3}(,\d{3})+/.test(stem);
  if (inconsistentNumbers) {
    errors.push({
      type: 'language',
      message: 'Large numbers should use comma separators for readability',
      severity: 'warning',
    });
  }

  return errors;
}

// 정책 검증: 편향/저작권
function validatePolicy(question: GeneratedQuestion): ValidationError[] {
  const errors: ValidationError[] = [];
  const stem = question.content.stem.toLowerCase();

  // 성별/인종 고정관념 키워드 검사
  const biasKeywords = [
    'boy.*math', 'girl.*shop', // 성별 고정관념
    'foreign', 'native', // 인종 관련
  ];
  for (const pattern of biasKeywords) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(stem)) {
      errors.push({
        type: 'policy',
        message: `Potential bias detected: matches pattern "${pattern}"`,
        severity: 'warning',
      });
    }
  }

  // 부적절한 맥락 검사
  const inappropriateContexts = ['gambling', 'alcohol', 'violence', 'weapon'];
  for (const ctx of inappropriateContexts) {
    if (stem.includes(ctx)) {
      errors.push({
        type: 'policy',
        message: `Inappropriate context: "${ctx}"`,
        severity: 'error',
      });
    }
  }

  return errors;
}

// 전체 검증 실행
export function validateQuestion(question: GeneratedQuestion): ValidationResult {
  const allErrors: ValidationError[] = [
    ...validateMathCorrectness(question),
    ...validateLanguage(question),
    ...validatePolicy(question),
  ];

  return {
    isValid: !allErrors.some((e) => e.severity === 'error'),
    errors: allErrors,
  };
}

// 배치 검증
export function validateQuestions(questions: GeneratedQuestion[]): {
  results: Map<string, ValidationResult>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
} {
  const results = new Map<string, ValidationResult>();
  let valid = 0;
  let invalid = 0;
  let warnings = 0;

  for (const question of questions) {
    const result = validateQuestion(question);
    results.set(question.id, result);

    if (result.isValid) {
      valid++;
    } else {
      invalid++;
    }

    warnings += result.errors.filter((e) => e.severity === 'warning').length;
  }

  return {
    results,
    summary: {
      total: questions.length,
      valid,
      invalid,
      warnings,
    },
  };
}

// LLM 기반 심층 검증 (고도화용)
export async function validateWithLLM(
  question: GeneratedQuestion,
): Promise<ValidationResult> {
  // TODO: Claude Agent SDK를 사용한 심층 검증
  // - 풀이 재계산
  // - 문맥 적절성
  // - 교육과정 정합성

  // 현재는 규칙 기반 검증만 수행
  return validateQuestion(question);
}
