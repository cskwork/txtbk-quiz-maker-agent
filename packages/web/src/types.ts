// 프론트엔드 타입 정의 (Core 타입과 동기화)

export type Grade = 
  | 'elementary-1-2'
  | 'elementary-3-4'
  | 'elementary-5-6'
  | 'middle-1'
  | 'middle-2'
  | 'middle-3'
  | 'high-1'
  | 'high-2'
  | 'high-3';

export type QuestionType = 'multiple_choice' | 'short_answer' | 'essay';

export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type CognitiveLevel = 'recall' | 'apply' | 'reason';

export type CurriculumVersion = '2015' | '2022';

export interface QuestionGenerationInput {
  grade: Grade;
  subject: string;
  topic: string;
  questionCount: number;
  questionType: QuestionType;
  englishLevel: EnglishLevel;
  difficulty: Difficulty;
  curriculumVersion: CurriculumVersion;
  seed?: number;
}

export interface ScoringRubric {
  fullScore: number;
  criteria: {
    description: string;
    points: number;
  }[];
}

export interface QuestionMetadata {
  achievementStandard?: string;
  difficulty: Difficulty;
  questionType: QuestionType;
  cognitiveLevel: CognitiveLevel;
  englishLevel: EnglishLevel;
  seed?: number;
  generatedAt: string;
}

export interface GeneratedQuestion {
  id: string;
  content: {
    stem: string;
    imageDescription?: string;
    choices?: string[];
  };
  answer: string | number;
  explanation: {
    steps: string[];
  };
  rubric?: ScoringRubric;
  metadata: QuestionMetadata;
}

export interface LearningPathNode {
  id: string;
  topic: string;
  prerequisiteIds: string[];
  questions: GeneratedQuestion[];
}

export interface RecommendationSet {
  diagnostic: GeneratedQuestion[];
  practice: GeneratedQuestion[];
  variation: GeneratedQuestion[];
  extension: GeneratedQuestion[];
  learningPath: LearningPathNode[];
}

// UI 상태 타입
export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  questions: GeneratedQuestion[];
}

export interface RecommendationState {
  isLoading: boolean;
  error: string | null;
  recommendations: RecommendationSet | null;
}
