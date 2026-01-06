import { useState } from 'react';
import type { 
  Grade, 
  QuestionType, 
  EnglishLevel, 
  Difficulty, 
  CurriculumVersion,
  QuestionGenerationInput,
} from '../types';

interface Props {
  onGenerate: (input: QuestionGenerationInput) => void;
  onRecommend: (input: QuestionGenerationInput) => void;
  isLoading: boolean;
}

// 학년 옵션
const GRADE_OPTIONS: { value: Grade; label: string }[] = [
  { value: 'elementary-1-2', label: '초등 1-2학년' },
  { value: 'elementary-3-4', label: '초등 3-4학년' },
  { value: 'elementary-5-6', label: '초등 5-6학년' },
  { value: 'middle-1', label: '중학교 1학년' },
  { value: 'middle-2', label: '중학교 2학년' },
  { value: 'middle-3', label: '중학교 3학년' },
  { value: 'high-1', label: '고등학교 1학년' },
  { value: 'high-2', label: '고등학교 2학년' },
  { value: 'high-3', label: '고등학교 3학년' },
];

// 문항 유형 옵션
const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: '객관식' },
  { value: 'short_answer', label: '단답형' },
  { value: 'essay', label: '서술형' },
];

// 영어 수준 옵션
const ENGLISH_LEVEL_OPTIONS: { value: EnglishLevel; label: string }[] = [
  { value: 'A1', label: 'A1 (초급)' },
  { value: 'A2', label: 'A2 (초중급)' },
  { value: 'B1', label: 'B1 (중급)' },
  { value: 'B2', label: 'B2 (중상급)' },
];

// 난이도 옵션
const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: '쉬움' },
  { value: 'medium', label: '보통' },
  { value: 'hard', label: '어려움' },
];

// 샘플 주제 (학년별)
const SAMPLE_TOPICS: Record<string, string[]> = {
  'elementary-1-2': ['한 자리 수 덧셈', '한 자리 수 뺄셈', '두 자리 수 이해'],
  'elementary-3-4': ['분수의 개념', '분수의 덧셈', '곱셈구구'],
  'elementary-5-6': ['분수의 나눗셈', '소수의 곱셈', '비와 비율'],
  'middle-1': ['정수와 유리수', '일차방정식', '좌표평면'],
  'middle-2': ['일차함수', '연립방정식', '부등식'],
  'middle-3': ['이차방정식', '이차함수', '피타고라스 정리'],
  'high-1': ['집합', '명제', '함수'],
  'high-2': ['수열', '지수와 로그', '삼각함수'],
  'high-3': ['미분', '적분', '확률과 통계'],
};

export function GeneratorPanel({ onGenerate, onRecommend, isLoading }: Props) {
  const [grade, setGrade] = useState<Grade>('middle-1');
  const [subject, setSubject] = useState('수학');
  const [topic, setTopic] = useState('일차방정식');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice');
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel>('B1');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [curriculumVersion, setCurriculumVersion] = useState<CurriculumVersion>('2022');

  // 입력 객체 생성
  const buildInput = (): QuestionGenerationInput => ({
    grade,
    subject,
    topic,
    questionCount,
    questionType,
    englishLevel,
    difficulty,
    curriculumVersion,
  });

  // 즉시 생성
  const handleGenerate = () => {
    onGenerate(buildInput());
  };

  // 추천 생성
  const handleRecommend = () => {
    onRecommend(buildInput());
  };

  // 학년 변경 시 샘플 주제 업데이트
  const handleGradeChange = (newGrade: Grade) => {
    setGrade(newGrade);
    const topics = SAMPLE_TOPICS[newGrade];
    if (topics && topics.length > 0) {
      setTopic(topics[0]);
    }
  };

  return (
    <div>
      {/* 학년 선택 */}
      <div className="form-group">
        <label className="form-label">학년</label>
        <select
          className="form-select"
          value={grade}
          onChange={(e) => handleGradeChange(e.target.value as Grade)}
        >
          {GRADE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 과목 */}
      <div className="form-group">
        <label className="form-label">과목</label>
        <input
          type="text"
          className="form-input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="예: 수학"
        />
      </div>

      {/* 주제 */}
      <div className="form-group">
        <label className="form-label">주제</label>
        <input
          type="text"
          className="form-input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예: 일차방정식"
          list="topic-suggestions"
        />
        <datalist id="topic-suggestions">
          {(SAMPLE_TOPICS[grade] || []).map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

      {/* 문항 수 */}
      <div className="form-group">
        <label className="form-label">문항 수</label>
        <input
          type="number"
          className="form-input"
          value={questionCount}
          onChange={(e) => setQuestionCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
          min={1}
          max={20}
        />
      </div>

      {/* 문항 유형 */}
      <div className="form-group">
        <label className="form-label">문항 유형</label>
        <select
          className="form-select"
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value as QuestionType)}
        >
          {QUESTION_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 영어 수준 */}
      <div className="form-group">
        <label className="form-label">영어 수준 (CEFR)</label>
        <select
          className="form-select"
          value={englishLevel}
          onChange={(e) => setEnglishLevel(e.target.value as EnglishLevel)}
        >
          {ENGLISH_LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 난이도 */}
      <div className="form-group">
        <label className="form-label">난이도</label>
        <select
          className="form-select"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
        >
          {DIFFICULTY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 교육과정 버전 */}
      <div className="form-group">
        <label className="form-label">교육과정 버전</label>
        <select
          className="form-select"
          value={curriculumVersion}
          onChange={(e) => setCurriculumVersion(e.target.value as CurriculumVersion)}
        >
          <option value="2022">2022 개정</option>
          <option value="2015">2015 개정</option>
        </select>
      </div>

      {/* 버튼 그룹 */}
      <div className="mt-lg">
        <button
          className="btn btn-primary btn-full mb-sm"
          onClick={handleGenerate}
          disabled={isLoading || !topic.trim()}
        >
          {isLoading ? '생성 중...' : '즉시 생성'}
        </button>
        <button
          className="btn btn-secondary btn-full"
          onClick={handleRecommend}
          disabled={isLoading || !topic.trim()}
        >
          추천 세트 생성
        </button>
      </div>
    </div>
  );
}
