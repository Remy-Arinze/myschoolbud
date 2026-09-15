'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

function safeUrl(url: string): string {
  return /^(https?:|mailto:|#)/i.test(url) ? url : '';
}

export function LoisMarkdown({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text) return null;

  return (
    <div className={cn('lois-md', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={safeUrl}
        components={{
          a: ({ href, children }) =>
            href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ) : (
              <>{children}</>
            ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
