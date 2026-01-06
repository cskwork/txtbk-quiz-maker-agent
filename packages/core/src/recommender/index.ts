// 추천 로직
// 3축 합성 점수: 성취기준 거리 + 오류모형 + 난이도 곡선

import type {
  QuestionGenerationInput,
  GeneratedQuestion,
  RecommendationSet,
  LearningPathNode,
  Difficulty,
  QuestionTemplate,
} from '../types/index.js';
import { generateQuestions, createDefaultTemplate } from '../generator/index.js';

// 난이도 수치화 (향후 점수 계산에 활용)
// const DIFFICULTY_SCORES: Record<Difficulty, number> = {
//   easy: 1,
//   medium: 2,
//   hard: 3,
// };

// 추천 유형별 난이도 매핑 (향후 확장용)
const _RECOMMENDATION_DIFFICULTY: Record<keyof Omit<RecommendationSet, 'learningPath'>, Difficulty> = {
  diagnostic: 'easy',    // 진단: 쉬움
  practice: 'medium',    // 연습: 중간
  variation: 'medium',   // 변형: 중간 (다른 맥락)
  extension: 'hard',     // 심화: 어려움
};

// 선수 개념 그래프 (샘플 데이터)
// TODO: 교육과정 데이터베이스에서 로드
const PREREQUISITE_GRAPH: Record<string, string[]> = {
  // 일차방정식 선수 개념
  'linear-equation': ['integer-operations', 'variable-concept', 'equality'],
  'variable-concept': ['integer-operations'],
  'integer-operations': ['natural-number-operations'],
  
  // 분수 선수 개념
  'fraction-addition': ['fraction-concept', 'common-denominator'],
  'fraction-concept': ['division-concept'],
  'common-denominator': ['lcm'],
  
  // 도형 선수 개념
  'triangle-area': ['rectangle-area', 'height-base-concept'],
  'rectangle-area': ['multiplication', 'length-measurement'],
};

// 후속 개념 그래프 (선수 그래프 역방향)
function buildFollowUpGraph(): Record<string, string[]> {
  const followUp: Record<string, string[]> = {};
  
  for (const [topic, prereqs] of Object.entries(PREREQUISITE_GRAPH)) {
    for (const prereq of prereqs) {
      if (!followUp[prereq]) {
        followUp[prereq] = [];
      }
      followUp[prereq].push(topic);
    }
  }
  
  return followUp;
}

const FOLLOW_UP_GRAPH = buildFollowUpGraph();

// 토픽 정규화 (입력 주제를 그래프 키로 변환)
function normalizeTopicKey(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// 선수 개념 추출 (1-hop, 2-hop)
function getPrerequisites(topic: string, depth: number = 2): string[] {
  const key = normalizeTopicKey(topic);
  const result: Set<string> = new Set();
  const queue: { topic: string; level: number }[] = [{ topic: key, level: 0 }];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.level >= depth) continue;
    
    const prereqs = PREREQUISITE_GRAPH[current.topic] || [];
    for (const prereq of prereqs) {
      if (!result.has(prereq)) {
        result.add(prereq);
        queue.push({ topic: prereq, level: current.level + 1 });
      }
    }
  }
  
  return Array.from(result);
}

// 후속 개념 추출
function _getFollowUps(topic: string, depth: number = 1): string[] {
  const key = normalizeTopicKey(topic);
  const result: Set<string> = new Set();
  const queue: { topic: string; level: number }[] = [{ topic: key, level: 0 }];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.level >= depth) continue;
    
    const followUps = FOLLOW_UP_GRAPH[current.topic] || [];
    for (const followUp of followUps) {
      if (!result.has(followUp)) {
        result.add(followUp);
        queue.push({ topic: followUp, level: current.level + 1 });
      }
    }
  }
  
  return Array.from(result);
}

// 토픽별 문항 생성
async function generateForTopic(
  baseInput: QuestionGenerationInput,
  topic: string,
  difficulty: Difficulty,
  count: number = 2,
): Promise<GeneratedQuestion[]> {
  const input: QuestionGenerationInput = {
    ...baseInput,
    topic,
    difficulty,
    questionCount: count,
  };
  
  const template = createDefaultTemplate(topic, baseInput.grade);
  return generateQuestions(input, template);
}

// 학습 경로 생성
async function buildLearningPath(
  baseInput: QuestionGenerationInput,
): Promise<LearningPathNode[]> {
  const prerequisites = getPrerequisites(baseInput.topic);
  const path: LearningPathNode[] = [];
  
  // 선수 개념부터 현재 주제까지 경로 구성
  for (const prereq of prerequisites) {
    const questions = await generateForTopic(baseInput, prereq, 'easy', 1);
    path.push({
      id: prereq,
      topic: prereq.replace(/-/g, ' '),
      prerequisiteIds: PREREQUISITE_GRAPH[prereq] || [],
      questions,
    });
  }
  
  // 현재 주제 추가
  const currentQuestions = await generateForTopic(baseInput, baseInput.topic, 'medium', 2);
  path.push({
    id: normalizeTopicKey(baseInput.topic),
    topic: baseInput.topic,
    prerequisiteIds: prerequisites,
    questions: currentQuestions,
  });
  
  return path;
}

// 추천 세트 생성
export async function generateRecommendations(
  input: QuestionGenerationInput,
  template?: QuestionTemplate,
): Promise<RecommendationSet> {
  const effectiveTemplate = template || createDefaultTemplate(input.topic, input.grade);
  
  // 1. 진단 문항 (선수 개념 확인용, 쉬움)
  const diagnosticInput: QuestionGenerationInput = {
    ...input,
    difficulty: 'easy',
    questionCount: 3,
  };
  const diagnostic = await generateQuestions(diagnosticInput, effectiveTemplate);
  
  // 2. 연습 문항 (동일 성취기준, 중간)
  const practiceInput: QuestionGenerationInput = {
    ...input,
    difficulty: 'medium',
    questionCount: 4,
  };
  const practice = await generateQuestions(practiceInput, effectiveTemplate);
  
  // 3. 변형 문항 (다른 맥락/표현, 중간)
  // TODO: 맥락 변형 로직 추가
  const variationInput: QuestionGenerationInput = {
    ...input,
    difficulty: 'medium',
    questionCount: 2,
    seed: (input.seed ?? 0) + 1000, // 다른 시드로 변형
  };
  const variation = await generateQuestions(variationInput, effectiveTemplate);
  
  // 4. 심화 문항 (확장, 어려움)
  const extensionInput: QuestionGenerationInput = {
    ...input,
    difficulty: 'hard',
    questionCount: 2,
  };
  const extension = await generateQuestions(extensionInput, effectiveTemplate);
  
  // 5. 학습 경로 구성
  const learningPath = await buildLearningPath(input);
  
  return {
    diagnostic,
    practice,
    variation,
    extension,
    learningPath,
  };
}

// 오류 모형 기반 보강 문항 생성
export async function generateRemediationQuestions(
  input: QuestionGenerationInput,
  _errorType: string, // 예: 'sign-error', 'carry-error' - 향후 오류 유형별 특화 문항 생성에 활용
  template?: QuestionTemplate,
): Promise<GeneratedQuestion[]> {
  // TODO: 오류 유형별 특화 문항 생성
  // 현재는 기본 생성으로 대체
  
  const effectiveTemplate = template || createDefaultTemplate(input.topic, input.grade);
  
  const remediationInput: QuestionGenerationInput = {
    ...input,
    difficulty: 'easy', // 보강은 쉬운 난이도로
    questionCount: 3,
  };
  
  return generateQuestions(remediationInput, effectiveTemplate);
}
