import { useState } from 'react';
import { GeneratorPanel } from './components/GeneratorPanel';
import { QuestionPreview } from './components/QuestionPreview';
import { RecommendationPanel } from './components/RecommendationPanel';
import type { GeneratedQuestion, RecommendationSet, QuestionGenerationInput } from './types';

type TabType = 'generate' | 'recommend';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationSet | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 문항 즉시 생성 핸들러
  const handleGenerate = async (input: QuestionGenerationInput) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const data = await response.json();
      setQuestions(data.questions);
      setActiveTab('generate');
    } catch (error) {
      console.error('Generation error:', error);
      alert('문항 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 추천 세트 생성 핸들러
  const handleRecommend = async (input: QuestionGenerationInput) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error('Recommendation failed');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
      setActiveTab('recommend');
    } catch (error) {
      console.error('Recommendation error:', error);
      alert('추천 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 내보내기 핸들러
  const handleExport = async (format: 'docx' | 'pdf' | 'json') => {
    const allQuestions = activeTab === 'recommend' && recommendations
      ? [
          ...recommendations.diagnostic,
          ...recommendations.practice,
          ...recommendations.variation,
          ...recommendations.extension,
        ]
      : questions;

    if (allQuestions.length === 0) {
      alert('내보낼 문항이 없습니다.');
      return;
    }

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: allQuestions,
          format,
          options: {
            includeAnswers: true,
            includeExplanations: true,
            title: '생성된 문항 모음',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // 파일 다운로드
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `questions.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('내보내기에 실패했습니다.');
    }
  };

  return (
    <div className="app-container">
      {/* 사이드바: 생성 패널 */}
      <aside className="sidebar">
        <div className="header">
          <h1>문항 생성기</h1>
        </div>
        
        <GeneratorPanel
          onGenerate={handleGenerate}
          onRecommend={handleRecommend}
          isLoading={isLoading}
        />
      </aside>

      {/* 메인 콘텐츠: 결과 표시 */}
      <main className="main-content">
        {/* 탭 네비게이션 */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            즉시 생성 ({questions.length})
          </button>
          <button
            className={`tab ${activeTab === 'recommend' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommend')}
          >
            추천 세트
          </button>
        </div>

        {/* 내보내기 버튼 */}
        {(questions.length > 0 || recommendations) && (
          <div className="mb-lg" style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => handleExport('docx')}>
              Word 다운로드
            </button>
            <button className="btn btn-secondary" onClick={() => handleExport('pdf')}>
              PDF 다운로드
            </button>
            <button className="btn btn-secondary" onClick={() => handleExport('json')}>
              JSON 다운로드
            </button>
          </div>
        )}

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="loading">
            <div className="spinner" />
          </div>
        )}

        {/* 결과 표시 */}
        {!isLoading && activeTab === 'generate' && (
          <QuestionPreview questions={questions} />
        )}

        {!isLoading && activeTab === 'recommend' && recommendations && (
          <RecommendationPanel recommendations={recommendations} />
        )}

        {/* 빈 상태 */}
        {!isLoading && questions.length === 0 && !recommendations && (
          <div className="text-center text-muted mt-lg">
            <p>왼쪽 패널에서 옵션을 선택하고 생성 버튼을 클릭하세요.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
