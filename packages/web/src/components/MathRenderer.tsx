// 수학 수식 렌더링 컴포넌트 (KaTeX 사용)
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
  text: string;
  displayMode?: boolean;
}

// 인라인 수식($...$)과 블록 수식($$...$$)을 파싱하여 렌더링
export function MathRenderer({ text, displayMode = false }: Props) {
  const renderedHtml = useMemo(() => {
    if (!text) return '';
    
    try {
      // 블록 수식 ($$...$$) 처리
      let result = text.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
        try {
          return katex.renderToString(math.trim(), {
            displayMode: true,
            throwOnError: false,
            strict: false,
          });
        } catch {
          return `$$${math}$$`;
        }
      });
      
      // 인라인 수식 ($...$) 처리 - 블록 수식과 구분하기 위해 음수 검사
      result = result.replace(/(?<!\$)\$([^$]+)\$(?!\$)/g, (_, math) => {
        try {
          return katex.renderToString(math.trim(), {
            displayMode: false,
            throwOnError: false,
            strict: false,
          });
        } catch {
          return `$${math}$`;
        }
      });
      
      return result;
    } catch {
      return text;
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
