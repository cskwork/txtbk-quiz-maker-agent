import { useState } from 'react';
import type { GeneratedQuestion } from '../types';
import { MathRenderer } from './MathRenderer';

interface Props {
  questions: GeneratedQuestion[];
}

// 난이도 라벨
const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

// 인지 수준 라벨
const COGNITIVE_LABELS: Record<string, string> = {
  recall: '재생',
  apply: '적용',
  reason: '추론',
};

// 개별 문항 카드
function QuestionCard({ question, index }: { question: GeneratedQuestion; index: number }) {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="question-card">
      {/* 문항 헤더 */}
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="question-number">{index + 1}</span>
          <div>
            <span className="badge badge-primary">
              {DIFFICULTY_LABELS[question.metadata.difficulty]}
            </span>
            <span className="badge badge-success">
              {COGNITIVE_LABELS[question.metadata.cognitiveLevel]}
            </span>
            <span className="badge badge-warning">
              {question.metadata.englishLevel}
            </span>
          </div>
        </div>
      </div>

      {/* 지문 - MathRenderer 사용 */}
      <p className="question-stem">
        <MathRenderer text={question.content.stem} />
      </p>

      {/* 선지 (객관식) - MathRenderer 사용 */}
      {question.content.choices && (
        <ul className="question-choices">
          {question.content.choices.map((choice, i) => {
            const isCorrect = choice.startsWith(String(question.answer));
            return (
              <li key={i} className={isCorrect ? 'correct' : ''}>
                <MathRenderer text={choice} />
              </li>
            );
          })}
        </ul>
      )}

      {/* 단답형/서술형 정답 */}
      {!question.content.choices && (
        <div className="mb-md">
          <strong>정답:</strong> <MathRenderer text={String(question.answer)} />
        </div>
      )}

      {/* 해설 토글 */}
      <div className="collapsible">
        <button
          className="collapsible-toggle"
          onClick={() => setShowExplanation(!showExplanation)}
        >
          <span>{showExplanation ? '▼' : '▶'}</span>
          <span>해설 {showExplanation ? '접기' : '보기'}</span>
        </button>

        {showExplanation && (
          <div className="collapsible-content">
            {question.explanation.steps.map((step, i) => (
              <p key={i} className="explanation-step">
                <MathRenderer text={step} />
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function QuestionPreview({ questions }: Props) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>
        생성된 문항 ({questions.length}개)
      </h2>
      {questions.map((question, index) => (
        <QuestionCard key={question.id} question={question} index={index} />
      ))}
    </div>
  );
}

