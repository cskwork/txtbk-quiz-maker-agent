// 공통 타입 정의
import { z } from 'zod';

// 학년 구분
export const GradeSchema = z.enum([
  'elementary-1-2', // 초1-2
  'elementary-3-4', // 초3-4
  'elementary-5-6', // 초5-6
  'middle-1',       // 중1
  'middle-2',       // 중2
  'middle-3',       // 중3
  'high-1',         // 고1
  'high-2',         // 고2
  'high-3',         // 고3
]);
export type Grade = z.infer<typeof GradeSchema>;

// 문항 유형
export const QuestionTypeSchema = z.enum([
  'multiple_choice',  // 객관식
  'short_answer',     // 단답형
  'essay',            // 서술형
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

// 영어 수준 (CEFR)
export const EnglishLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2']);
export type EnglishLevel = z.infer<typeof EnglishLevelSchema>;

// 난이도
export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof DifficultySchema>;

// 인지 수준
export const CognitiveLevelSchema = z.enum(['recall', 'apply', 'reason']);
export type CognitiveLevel = z.infer<typeof CognitiveLevelSchema>;

// 교육과정 버전
export const CurriculumVersionSchema = z.enum(['2015', '2022']);
export type CurriculumVersion = z.infer<typeof CurriculumVersionSchema>;

// 문항 생성 입력
export const QuestionGenerationInputSchema = z.object({
  grade: GradeSchema,
  subject: z.string().min(1),
  topic: z.string().min(1),
  questionCount: z.number().int().min(1).max(20).default(5),
  questionType: QuestionTypeSchema,
  englishLevel: EnglishLevelSchema,
  difficulty: DifficultySchema,
  curriculumVersion: CurriculumVersionSchema.default('2022'),
  seed: z.number().int().optional(), // 재현성용
});
export type QuestionGenerationInput = z.infer<typeof QuestionGenerationInputSchema>;

// 채점 기준 (서술형용)
export interface ScoringRubric {
  fullScore: number;
  criteria: {
    description: string;
    points: number;
  }[];
}

// 문항 메타데이터
export interface QuestionMetadata {
  achievementStandard?: string;  // 성취기준 코드
  difficulty: Difficulty;
  questionType: QuestionType;
  cognitiveLevel: CognitiveLevel;
  englishLevel: EnglishLevel;
  seed?: number;
  generatedAt: string;
}

// 생성된 문항
export interface GeneratedQuestion {
  id: string;
  content: {
    stem: string;              // 지문
    imageDescription?: string; // 그림 설명 (필요시)
    choices?: string[];        // 선지 (객관식)
  };
  answer: string | number;
  explanation: {
    steps: string[];           // 풀이 단계
  };
  rubric?: ScoringRubric;      // 채점기준 (서술형)
  metadata: QuestionMetadata;
}

// 검증 결과
export interface ValidationResult {
  isValid: boolean;
  errors: {
    type: 'math' | 'language' | 'policy';
    message: string;
    severity: 'error' | 'warning';
  }[];
}

// 추천 유형
export const RecommendationTypeSchema = z.enum([
  'diagnostic',  // 진단 (쉬움)
  'practice',    // 동일성취 연습 (중간)
  'variation',   // 변형/전이 (중상)
  'extension',   // 심화/확장 (상)
]);
export type RecommendationType = z.infer<typeof RecommendationTypeSchema>;

// 학습 경로 노드
export interface LearningPathNode {
  id: string;
  topic: string;
  prerequisiteIds: string[];  // 선수 개념 ID
  questions: GeneratedQuestion[];
}

// 추천 세트
export interface RecommendationSet {
  diagnostic: GeneratedQuestion[];
  practice: GeneratedQuestion[];
  variation: GeneratedQuestion[];
  extension: GeneratedQuestion[];
  learningPath: LearningPathNode[];
}

// 문항 템플릿
export interface QuestionTemplate {
  id: string;
  topic: string;
  grade: Grade;
  questionType: QuestionType;
  // 수학 개체 스키마
  mathSchema: {
    variableRanges: Record<string, { min: number; max: number; step?: number }>;
    constraints?: string[];  // 제약 조건
  };
  // 풀이 템플릿
  solutionTemplate: string;
  // 오답 생성 규칙
  errorPatterns?: {
    name: string;
    description: string;
    generator: string;  // 오답 생성 표현식
  }[];
  // 영어 표현 템플릿
  stemTemplates: Record<EnglishLevel, string[]>;
}
