// 수학 수식 렌더링 컴포넌트 (KaTeX 사용)
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
  text: string;
  displayMode?: boolean;
}

// 일반 텍스트를 HTML로 이스케이프 (KaTeX 출력과 합치기 전에 적용)
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 수식 하나를 KaTeX HTML로 렌더링, 실패 시 원문을 이스케이프하여 그대로 표시
function renderMath(math: string, displayMode: boolean, delimiter: string): string {
  try {
    return katex.renderToString(math.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return escapeHtml(`${delimiter}${math}${delimiter}`);
  }
}

// 인라인 수식($...$)과 블록 수식($$...$$)을 파싱하여 렌더링
export function MathRenderer({ text, displayMode = false }: Props) {
  const renderedHtml = useMemo(() => {
    if (!text) return '';

    try {
      // 텍스트와 수식을 먼저 분리 (split 캡처 그룹 → 홀수 인덱스가 수식)
      // 블록 수식 ($$...$$) 처리
      return text.split(/\$\$([^$]+)\$\$/).map((blockPart, i) => {
        if (i % 2 === 1) return renderMath(blockPart, true, '$$');

        // 인라인 수식 ($...$) 처리 - 블록 수식과 구분하기 위해 음수 검사
        return blockPart.split(/(?<!\$)\$([^$]+)\$(?!\$)/).map((inlinePart, j) =>
          j % 2 === 1 ? renderMath(inlinePart, false, '$') : escapeHtml(inlinePart)
        ).join('');
      }).join('');
    } catch {
      return escapeHtml(text);
    }
  }, [text]);

  // displayMode가 true이면 전체를 수식으로 처리
  if (displayMode) {
    try {
      const html = katex.renderToString(text, {
        displayMode: true,
        throwOnError: false,
        strict: false,
      });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <span>{text}</span>;
    }
  }

  return <span dangerouslySetInnerHTML={{ __html: renderedHtml }} />;
}

// 텍스트에 수식 포함 여부 확인
export function hasMath(text: string): boolean {
  return /\$[^$]+\$/.test(text);
}
