
'use client';

import React, { useEffect, useRef } from 'react';
import renderMathInElement from 'katex/dist/contrib/auto-render';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';

interface Props {
  content: string;
  className?: string;
}

/**
 * A robust component for rendering HTML content with embedded KaTeX math expressions.
 * Supports delimiters like $...$, $$...$$, \(...\), and \[...\].
 */
export const RichTextRenderer = React.memo(({ content, className }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        renderMathInElement(containerRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
          ],
          throwOnError: false,
          ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        });
      } catch (e) {
        console.error("RichTextRenderer: KaTeX failed to render math.", e);
      }
    }
  }, [content]);

  if (!content) return null;

  return (
    <div
      ref={containerRef}
      className={cn("prose-exam", className)}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
});

RichTextRenderer.displayName = "RichTextRenderer";
