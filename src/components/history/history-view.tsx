import { ChatCircleIcon, MagnifyingGlassIcon, PushPinIcon, TrashIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import type { HistoryItem } from '@/lib/contracts';
import { cn, formatRelativeDate } from '@/lib/utils';

interface HistoryViewProps {
  onContinue: (item: HistoryItem) => void;
}

export function HistoryView({ onContinue }: HistoryViewProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );

  useEffect(() => {
    void window.asyncDesktop.history.list().then(setItems);
  }, []);

  async function togglePin(item: HistoryItem) {
    const updated = await window.asyncDesktop.history.update(item.id, { pinned: !item.pinned });
    setItems((current) =>
      current.map((candidate) => (candidate.id === item.id ? updated : candidate))
    );
  }

  async function rename(item: HistoryItem, title: string) {
    const updated = await window.asyncDesktop.history.update(item.id, { title });
    setItems((current) =>
      current.map((candidate) => (candidate.id === item.id ? updated : candidate))
    );
  }

  async function remove(item: HistoryItem) {
    await window.asyncDesktop.history.remove(item.id);
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-7 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--faint)]">
              Local history
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">
              Continue where you left off.
            </h1>
          </div>
          <label className="flex h-10 w-64 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3">
            <MagnifyingGlassIcon className="size-3.5 text-[var(--faint)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search conversations"
              aria-label="Search history"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--faint)]"
            />
          </label>
        </div>

        <div className="space-y-2">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-[var(--border-strong)]"
            >
              <button
                type="button"
                onClick={() => onContinue(item)}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)]"
                aria-label={`Continue ${item.title}`}
              >
                <ChatCircleIcon className="size-4" />
              </button>
              <div className="min-w-0 flex-1">
                <input
                  defaultValue={item.title}
                  onBlur={(event) => void rename(item, event.target.value)}
                  aria-label="Conversation title"
                  className="w-full truncate bg-transparent text-sm font-semibold outline-none"
                />
                <p className="mt-1 text-[10px] text-[var(--faint)]">
                  {item.messages.length} messages · {formatRelativeDate(item.updatedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void togglePin(item)}
                aria-label={item.pinned ? 'Unpin conversation' : 'Pin conversation'}
                className={cn(
                  'flex size-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]',
                  item.pinned && 'text-[var(--text)]'
                )}
              >
                <PushPinIcon className="size-4" weight={item.pinned ? 'fill' : 'regular'} />
              </button>
              <button
                type="button"
                onClick={() => void remove(item)}
                aria-label="Delete conversation"
                className="flex size-9 items-center justify-center rounded-lg text-[var(--muted)] opacity-0 transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)] group-hover:opacity-100 focus:opacity-100"
              >
                <TrashIcon className="size-4" />
              </button>
            </article>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center text-sm text-[var(--faint)]">
              Your conversations stay on this device and will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
