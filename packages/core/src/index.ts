// Core 패키지 진입점
// 모든 공개 API 내보내기

// 타입 내보내기
export * from './types/index.js';

// 에이전트
export {
  runAgent,
  generateQuestionsWithAgent,
  surfaceToEnglish,
  surfaceToKorean,
  AgentError,
} from './agent/index.js';
export type {
  AgentMessage,
  AgentQueryOptions,
  AgentErrorCode,
} from './agent/index.js';

// 생성기
export {
  generateQuestions,
  createDefaultTemplate,
} from './generator/index.js';

export {
  loadTemplate,
} from './generator/template-loader.js';

// 검증기
export {
  validateQuestion,
  validateQuestions,
  validateWithLLM,
} from './validator/index.js';

// 추천기
export {
  generateRecommendations,
  generateRemediationQuestions,
} from './recommender/index.js';
