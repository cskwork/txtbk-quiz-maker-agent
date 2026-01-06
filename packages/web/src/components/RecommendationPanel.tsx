import { useState } from 'react';
import type { RecommendationSet, GeneratedQuestion } from '../types';

interface Props {
  recommendations: RecommendationSet;
}

// 추천 유형별 정보
const RECOMMENDATION_INFO: Record<string, { label: string; description: string; color: string }> = {
  diagnostic: {
    label: '진단 문항',
    description: '선수 학습 확인을 위한 기초 문항',
    color: '#10b981',
  },
  practice: {
    label: '연습 문항',
    description: '동일 성취기준 반복 연습',
    color: '#6366f1',
  },
  variation: {
    label: '변형 문항',
    description: '다른 맥락으로 전이 확인',
    color: '#f59e0b',
  },
  extension: {
    label: '심화 문항',
    description: '확장된 난이도의 도전 과제',
    color: '#ef4444',
  },
};

// 문항 미니 카드
function QuestionMiniCard({ question, index }: { question: GeneratedQuestion; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className="card" 
      style={{ cursor: 'pointer' }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span className="question-number" style={{ flexShrink: 0 }}>
          {index + 1}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ 
            fontSize: '0.9375rem', 
            lineHeight: 1.6,
            marginBottom: expanded ? '1rem' : 0,
          }}>
            {question.content.stem}
          </p>

          {expanded && (
            <>
              {/* 선지 */}
              {question.content.choices && (
                <ul className="question-choices">
                  {question.content.choices.map((choice, i) => {
                    const isCorrect = choice.startsWith(String(question.answer));
                    return (
                      <li key={i} className={isCorrect ? 'correct' : ''}>
                        {choice}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* 정답 (단답형) */}
              {!question.content.choices && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>정답:</strong> {question.answer}
                </div>
              )}

              {/* 해설 */}
              <div className="collapsible-content">
                {question.explanation.steps.map((step, i) => (
                  <p key={i} className="explanation-step">{step}</p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 추천 섹션
function RecommendationSection({ 
  type, 
  questions 
}: { 
  type: keyof typeof RECOMMENDATION_INFO; 
  questions: GeneratedQuestion[];
}) {
  const info = RECOMMENDATION_INFO[type];

  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="recommendation-section">
      <h3 className="recommendation-title" style={{ color: info.color }}>
        {info.label} ({questions.length}개)
      </h3>
      <p className="text-muted mb-md" style={{ fontSize: '0.875rem' }}>
        {info.description}
      </p>
      {questions.map((question, index) => (
        <QuestionMiniCard key={question.id} question={question} index={index} />
      ))}
    </div>
  );
}

// 학습 경로 시각화
function LearningPathVisualization({ recommendations }: Props) {
  const { learningPath } = recommendations;

  if (learningPath.length === 0) {
    return null;
  }

  return (
    <div className="recommendation-section">
      <h3 className="recommendation-title">학습 경로</h3>
      <p className="text-muted mb-md" style={{ fontSize: '0.875rem' }}>
        선수 개념부터 현재 주제까지의 학습 순서
      </p>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        flexWrap: 'wrap',
        padding: '1rem',
        background: 'var(--bg-tertiary)',
        borderRadius: '8px',
      }}>
        {learningPath.map((node, index) => (
          <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              padding: '8px 16px',
              background: index === learningPath.length - 1 
                ? 'var(--color-primary)' 
                : 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              fontSize: '0.875rem',
              fontWeight: index === learningPath.length - 1 ? 600 : 400,
              color: index === learningPath.length - 1 
                ? 'white' 
                : 'var(--text-secondary)',
            }}>
              {node.topic}
            </div>
            {index < learningPath.length - 1 && (
              <span style={{ color: 'var(--text-muted)' }}>→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecommendationPanel({ recommendations }: Props) {
  // 총 문항 수 계산
  const totalQuestions = 
    recommendations.diagnostic.length +
    recommendations.practice.length +
    recommendations.variation.length +
    recommendations.extension.length;

  return (
    <div>
      <h2 style={{ marginBottom: '0.5rem' }}>
        추천 문항 세트
      </h2>
      <p className="text-muted mb-lg">
        총 {totalQuestions}개의 문항이 생성되었습니다.
      </p>

      {/* 학습 경로 */}
      <LearningPathVisualization recommendations={recommendations} />

      {/* 진단 문항 */}
      <RecommendationSection type="diagnostic" questions={recommendations.diagnostic} />

      {/* 연습 문항 */}
      <RecommendationSection type="practice" questions={recommendations.practice} />

      {/* 변형 문항 */}
      <RecommendationSection type="variation" questions={recommendations.variation} />

      {/* 심화 문항 */}
      <RecommendationSection type="extension" questions={recommendations.extension} />
    </div>
  );
}
