import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  QuestionIcon,
  SparkleIcon,
} from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import type { TransformRequest, TransformResult } from '@/lib/contracts';

interface WritingViewProps {
  initialContent: string;
  onInitialContentChange: (value: string) => void;
  onAskWhy: (prompt: string) => void;
  onOpenDiagnostics: () => void;
}

const ACTIONS: Array<{ id: TransformRequest['instruction']; label: string }> = [
  { id: 'improve', label: 'Improve writing' },
  { id: 'grammar', label: 'Fix grammar' },
  { id: 'clearer', label: 'Make clearer' },
  { id: 'concise', label: 'Make concise' },
  { id: 'rewrite', label: 'Rewrite' },
  { id: 'translate', label: 'Translate' },
];

export function WritingView({
  initialContent,
  onInitialContentChange,
  onAskWhy,
  onOpenDiagnostics,
}: WritingViewProps) {
  const [instruction, setInstruction] = useState<TransformRequest['instruction']>('improve');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [result, setResult] = useState<TransformResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const reducedMotion = useReducedMotion();

  async function transform() {
    if (!initialContent.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      setResult(
        await window.asyncDesktop.ai.transform({
          content: initialContent,
          instruction,
          targetLanguage: instruction === 'translate' ? targetLanguage : undefined,
        })
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Transformation failed.');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-7 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--faint)]">
              Writing assistant
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">Write better. Learn why.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
              Transform your text, inspect the result, and understand the choices ASYNC made.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={instruction}
              onChange={(event) =>
                setInstruction(event.target.value as TransformRequest['instruction'])
              }
              aria-label="Writing action"
              className="field-control h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs outline-none"
            >
              {ACTIONS.map((action) => (
                <option key={action.id} value={action.id}>
                  {action.label}
                </option>
              ))}
            </select>
            {instruction === 'translate' && (
              <input
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
                aria-label="Target language"
                className="field-control h-10 w-28 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs outline-none"
              />
            )}
            <button
              type="button"
              onClick={() => void transform()}
              disabled={!initialContent.trim() || loading}
              className="flex h-10 items-center gap-2 rounded-xl bg-[var(--text)] px-4 text-xs font-semibold text-[var(--bg)] transition hover:opacity-85 disabled:opacity-30"
            >
              <SparkleIcon className={loading ? 'size-4 animate-pulse' : 'size-4'} />
              {loading ? 'ASYNC is reviewing' : 'Transform'}
            </button>
          </div>
        </div>

        <div className="grid min-h-[430px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] lg:grid-cols-2">
          <section className="editor-frame flex min-h-[320px] flex-col border-b border-[var(--border)] lg:border-b-0 lg:border-r">
            <div className="flex h-12 items-center justify-between border-b border-[var(--border)] px-4">
              <span className="text-xs font-semibold">Original</span>
              <span className="text-[10px] text-[var(--faint)]">
                {initialContent.length} characters
              </span>
            </div>
            <textarea
              value={initialContent}
              onChange={(event) => onInitialContentChange(event.target.value)}
              placeholder="Paste or write the text you want to improve..."
              aria-label="Original text"
              className="min-h-0 flex-1 resize-none bg-transparent p-5 text-sm leading-7 outline-none placeholder:text-[var(--faint)]"
            />
          </section>
          <section className="flex min-h-[320px] flex-col">
            <div className="flex h-12 items-center justify-between border-b border-[var(--border)] px-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">ASYNC</span>
                {result && (
                  <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] text-[var(--faint)]">
                    {result.confidence} confidence
                  </span>
                )}
              </div>
              {result && (
                <button
                  type="button"
                  onClick={() => void copy()}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                >
                  {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {loading && (
                <output className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                  <span className="mr-2 size-1.5 animate-pulse rounded-full bg-[var(--text)]" />
                  ASYNC is reviewing
                </output>
              )}
              {!loading && !result && !error && (
                <div className="flex h-full items-center justify-center text-center text-sm text-[var(--faint)]">
                  Your transformed text will appear here.
                </div>
              )}
              {error && (
                <div
                  role="alert"
                  className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-[var(--muted)]"
                >
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={onOpenDiagnostics}
                    className="font-semibold text-[var(--text)] hover:underline"
                  >
                    Open Diagnostics
                  </button>
                </div>
              )}
              {result && !loading && (
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <p className="whitespace-pre-wrap text-sm leading-7">{result.result}</p>
                  {result.changes.length > 0 && (
                    <div className="mt-7 border-t border-[var(--border)] pt-5">
                      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
                        What changed
                      </h2>
                      <ul className="mt-3 space-y-2.5">
                        {result.changes.slice(0, 5).map((change, index) => (
                          <li
                            key={`${change.reason}-${index}`}
                            className="text-xs leading-5 text-[var(--muted)]"
                          >
                            {change.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </section>
        </div>

        {result && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onInitialContentChange(result.result)}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-[var(--text)] px-3 text-xs font-semibold text-[var(--bg)] hover:opacity-85"
            >
              Replace <ArrowRightIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void copy()}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-xs hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
            >
              <CopyIcon className="size-3.5" /> Copy
            </button>
            <button
              type="button"
              onClick={() => void transform()}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-xs hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
            >
              <ArrowCounterClockwiseIcon className="size-3.5" /> Try again
            </button>
            <button
              type="button"
              onClick={() =>
                onAskWhy(
                  `Explain why you made these changes and teach me the relevant rules:\n\nOriginal:\n${initialContent}\n\nResult:\n${result.result}\n\nSummary:\n${result.explanation}`
                )
              }
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-xs hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
            >
              <QuestionIcon className="size-3.5" /> Ask why
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
