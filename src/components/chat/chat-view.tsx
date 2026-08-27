import {
  ArrowDownIcon,
  BookOpenTextIcon,
  BugIcon,
  CheckIcon,
  CopyIcon,
  PencilLineIcon,
  SparkleIcon,
  TerminalWindowIcon,
} from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { detectContentKind, getContextActions } from '@/lib/context-detection';
import type { AppSettings, AsyncMessage, AsyncTask, HistoryItem } from '@/lib/contracts';
import { cn } from '@/lib/utils';
import { AsyncLogo } from '../brand/async-logo';
import { MonochromeParticles } from '../ui/monochrome-particles';
import { ChatComposer, type ComposerAttachment } from './chat-composer';

const MarkdownMessage = lazy(() =>
  import('./markdown-message').then((module) => ({ default: module.MarkdownMessage }))
);

interface ConversationSeed {
  id?: string;
  messages: AsyncMessage[];
  task?: AsyncTask;
}

interface ChatViewProps {
  settings: AppSettings;
  draft: string;
  seed: ConversationSeed;
  engineReady: boolean;
  onDraftChange: (draft: string) => void;
  onHistorySaved: () => void;
  onOpenDiagnostics: () => void;
}

const EMPTY_SUGGESTIONS = [
  { label: 'Improve writing', icon: PencilLineIcon, prompt: 'Improve this writing:' },
  { label: 'Explain code', icon: TerminalWindowIcon, prompt: 'Explain what this code does:' },
  { label: 'Teach me this', icon: BookOpenTextIcon, prompt: 'Teach me this concept step by step:' },
  { label: 'Debug an error', icon: BugIcon, prompt: 'Help me debug this error:' },
];

function taskForContent(content: string): AsyncTask {
  const kind = detectContentKind(content);
  if (kind === 'code') return 'code-review';
  if (kind === 'error' || kind === 'stack_trace') return 'debug';
  if (kind === 'plain_text') return 'teacher';
  return 'chat';
}

function createMessage(role: AsyncMessage['role'], content: string): AsyncMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() };
}

export function ChatView({
  settings,
  draft,
  seed,
  engineReady,
  onDraftChange,
  onHistorySaved,
  onOpenDiagnostics,
}: ChatViewProps) {
  const [messages, setMessages] = useState<AsyncMessage[]>(seed.messages);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesRef = useRef(messages);
  const responseIdRef = useRef<string | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef(seed.id ?? crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const contentKind = useMemo(() => detectContentKind(draft), [draft]);
  const contextualActions = useMemo(() => getContextActions(contentKind), [contentKind]);

  const replaceMessages = useCallback((next: AsyncMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const persistConversation = useCallback(
    async (nextMessages: AsyncMessage[]) => {
      const firstUser = nextMessages.find((message) => message.role === 'user');
      if (!firstUser) return;
      const now = new Date().toISOString();
      const item: HistoryItem = {
        id: sessionIdRef.current,
        title: firstUser.content.replace(/\s+/g, ' ').slice(0, 58),
        messages: nextMessages,
        createdAt: nextMessages[0]?.createdAt ?? now,
        updatedAt: now,
        pinned: false,
        task: taskForContent(firstUser.content),
      };
      await window.asyncDesktop.history.save(item);
      onHistorySaved();
    },
    [onHistorySaved]
  );

  useEffect(() => {
    const unsubscribe = window.asyncDesktop.ai.onChatEvent((event) => {
      if (event.requestId !== activeRequestIdRef.current || !responseIdRef.current) return;
      const responseId = responseIdRef.current;
      if (event.type === 'delta' && event.text) {
        replaceMessages(
          messagesRef.current.map((message) =>
            message.id === responseId
              ? { ...message, content: `${message.content}${event.text}` }
              : message
          )
        );
        return;
      }
      if (event.type === 'error') {
        const next = messagesRef.current.filter((message) => message.id !== responseId);
        replaceMessages(next);
        setStreamError(event.error?.message ?? "ASYNC couldn't complete that request.");
        setActiveRequestId(null);
        activeRequestIdRef.current = null;
        responseIdRef.current = null;
        return;
      }
      if (event.type === 'done') {
        setActiveRequestId(null);
        activeRequestIdRef.current = null;
        responseIdRef.current = null;
        void persistConversation(messagesRef.current);
      }
    });
    return unsubscribe;
  }, [persistConversation, replaceMessages]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !isAtBottom || messages.length === 0) return;
    element.scrollTo({ top: element.scrollHeight, behavior: activeRequestId ? 'auto' : 'smooth' });
  }, [messages, activeRequestId, isAtBottom]);

  async function send(customPrompt?: string) {
    const visibleText = customPrompt ?? draft;
    if ((!visibleText.trim() && attachments.length === 0) || activeRequestId) return;
    if (!engineReady) {
      setStreamError('Finish local setup before asking ASYNC.');
      return;
    }
    const attachmentContext = attachments
      .map(
        (attachment) =>
          `\n\nAttached file: ${attachment.name}\n\n\`\`\`\n${attachment.content}\n\`\`\``
      )
      .join('');
    const userMessage = createMessage('user', `${visibleText.trim()}${attachmentContext}`);
    const assistantMessage = createMessage('assistant', '');
    const nextMessages = [...messagesRef.current, userMessage, assistantMessage];
    replaceMessages(nextMessages);
    setStreamError(null);
    onDraftChange('');
    setAttachments([]);
    const requestId = crypto.randomUUID();
    responseIdRef.current = assistantMessage.id ?? null;
    activeRequestIdRef.current = requestId;
    setActiveRequestId(requestId);
    setIsAtBottom(true);
    await window.asyncDesktop.ai.startChat({
      requestId,
      messages: nextMessages.filter((message) => message.id !== assistantMessage.id),
      task: taskForContent(userMessage.content),
      responseDetail: settings.responseDetail,
      learningStyle: settings.learningStyle,
      codeExperience: settings.codeExperience,
    });
  }

  async function stop() {
    if (!activeRequestId) return;
    await window.asyncDesktop.ai.cancelChat(activeRequestId);
    setActiveRequestId(null);
    activeRequestIdRef.current = null;
    responseIdRef.current = null;
  }

  function applyAction(prompt: string) {
    if (!draft.trim()) {
      onDraftChange(prompt);
      return;
    }
    onDraftChange(`${prompt}\n\n${draft}`);
  }

  async function copyMessage(message: AsyncMessage) {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id ?? null);
    window.setTimeout(() => setCopiedId(null), 1400);
  }

  const hasConversation = messages.length > 0;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <MonochromeParticles />
      {!hasConversation ? (
        <div className="relative z-10 flex min-h-0 flex-1 overflow-y-auto px-5 py-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col justify-center py-6">
            <div className="mb-8 text-center">
              <div className="mb-4 flex items-center justify-center gap-3">
                <AsyncLogo className="[&_span]:size-12" />
                <h1 className="text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  What are you working on?
                </h1>
              </div>
              <p className="mx-auto max-w-xl text-sm leading-6 text-[var(--muted)]">
                Ask about your writing, code, studies, or anything you want to understand better.
              </p>
            </div>

            <ChatComposer
              value={draft}
              attachments={attachments}
              busy={Boolean(activeRequestId)}
              onChange={onDraftChange}
              onAttachmentsChange={setAttachments}
              onSend={() => void send()}
              onStop={() => void stop()}
            />

            <AnimatePresence mode="wait">
              {draft.trim() ? (
                <motion.div
                  key={contentKind}
                  initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 grid gap-1 sm:grid-cols-2"
                >
                  {contextualActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => applyAction(action.prompt)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-[var(--muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                    >
                      <SparkleIcon className="size-3.5" />
                      {action.label}
                    </button>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty-actions"
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 grid gap-1 sm:grid-cols-2"
                >
                  {EMPTY_SUGGESTIONS.map((suggestion) => {
                    const Icon = suggestion.icon;
                    return (
                      <button
                        key={suggestion.label}
                        type="button"
                        onClick={() => onDraftChange(suggestion.prompt)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                      >
                        <Icon className="size-4 text-[var(--text)]" />
                        {suggestion.label}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {streamError && (
              <div
                role="alert"
                className="mt-5 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--muted)]"
              >
                <span>{streamError}</span>
                <button
                  type="button"
                  onClick={onOpenDiagnostics}
                  className="font-semibold text-[var(--text)] hover:underline"
                >
                  Diagnostics
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            onScroll={(event) => {
              const element = event.currentTarget;
              setIsAtBottom(element.scrollHeight - element.scrollTop - element.clientHeight < 90);
            }}
            className="relative z-10 min-h-0 flex-1 overflow-y-auto"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 sm:px-8">
              {messages.map((message) => (
                <motion.article
                  key={message.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('group', message.role === 'user' && 'flex justify-end')}
                >
                  {message.role === 'user' ? (
                    <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-sm leading-6">
                      {message.content}
                    </div>
                  ) : (
                    <div className="min-w-0 max-w-full">
                      <div className="mb-2.5 flex items-center gap-2">
                        <AsyncLogo className="[&_span]:size-5" />
                        <span className="text-[11px] font-semibold tracking-[0.12em]">ASYNC</span>
                      </div>
                      {message.content ? (
                        <Suspense
                          fallback={
                            <output className="text-sm text-[var(--muted)]">
                              ASYNC is formatting the response
                            </output>
                          }
                        >
                          <MarkdownMessage content={message.content} />
                        </Suspense>
                      ) : (
                        <output className="flex items-center gap-2 text-sm text-[var(--muted)]">
                          <span className="size-1.5 animate-pulse rounded-full bg-[var(--text)]" />
                          ASYNC is explaining
                        </output>
                      )}
                      {message.content && message.id !== responseIdRef.current && (
                        <button
                          type="button"
                          onClick={() => void copyMessage(message)}
                          className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] text-[var(--faint)] opacity-0 transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)] group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          {copiedId === message.id ? (
                            <CheckIcon className="size-3" />
                          ) : (
                            <CopyIcon className="size-3" />
                          )}
                          {copiedId === message.id ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                  )}
                </motion.article>
              ))}

              {!activeRequestId && messages.at(-1)?.role === 'assistant' && (
                <div className="flex flex-wrap gap-2 pl-7">
                  {['Explain simpler', 'Show example', 'Quiz me'].map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => void send(label)}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {streamError && (
                <p role="alert" className="text-sm text-[var(--muted)]">
                  {streamError}
                </p>
              )}
            </div>
          </div>
          {!isAtBottom && (
            <button
              type="button"
              onClick={() =>
                scrollRef.current?.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: 'smooth',
                })
              }
              className="absolute bottom-36 left-1/2 z-30 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-lg hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
              aria-label="Scroll to latest message"
            >
              <ArrowDownIcon className="size-4" />
            </button>
          )}
          <div className="relative z-20 shrink-0 px-5 pb-5 pt-2">
            <div className="mx-auto max-w-3xl">
              <ChatComposer
                value={draft}
                attachments={attachments}
                busy={Boolean(activeRequestId)}
                onChange={onDraftChange}
                onAttachmentsChange={setAttachments}
                onSend={() => void send()}
                onStop={() => void stop()}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export type { ConversationSeed };
