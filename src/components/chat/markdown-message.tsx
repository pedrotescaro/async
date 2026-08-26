import { CheckIcon, CopyIcon } from '@phosphor-icons/react';
import { type ReactNode, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

function extractText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return extractText((children as { props?: { children?: ReactNode } }).props?.children);
  }
  return '';
}

function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const code = extractText(children).replace(/\n$/, '');
  const language = className?.replace('language-', '') || 'code';

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-white/10 bg-[#080808] text-[#e8e8e8]">
      <div className="flex items-center justify-between border-b border-white/8 px-3.5 py-2 text-[10px] uppercase tracking-[0.12em] text-[#777777]">
        <span>{language}</span>
        <button
          type="button"
          onClick={copyCode}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] normal-case tracking-normal text-[#8b8b8b] transition hover:bg-white/8 hover:text-white"
        >
          {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[12px] leading-6">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

const COMPONENTS: Components = {
  pre: ({ children }) => <>{children}</>,
  code: ({ children, className }) => {
    const code = extractText(children);
    const isBlock = Boolean(className?.startsWith('language-') || code.includes('\n'));
    if (isBlock) return <CodeBlock className={className}>{children}</CodeBlock>;
    return <code>{children}</code>;
  },
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
};

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
