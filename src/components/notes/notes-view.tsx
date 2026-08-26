import {
  ChatCircleIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  PlusIcon,
  PushPinIcon,
  SparkleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import type { Note } from '@/lib/contracts';
import { cn, formatRelativeDate } from '@/lib/utils';

interface NotesViewProps {
  onSendToAsync: (prompt: string) => void;
}

export function NotesView({ onSendToAsync }: NotesViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const selected = notes.find((note) => note.id === selectedId) ?? notes[0] ?? null;
  const filtered = useMemo(
    () =>
      notes.filter((note) =>
        `${note.title} ${note.content}`.toLowerCase().includes(query.toLowerCase())
      ),
    [notes, query]
  );

  useEffect(() => {
    void window.asyncDesktop.notes.list().then((items) => {
      setNotes(items);
      setSelectedId((current) => current ?? items[0]?.id ?? null);
    });
  }, []);

  async function createNote() {
    const note = await window.asyncDesktop.notes.create({ title: 'Untitled note', content: '' });
    setNotes((current) => [note, ...current]);
    setSelectedId(note.id);
  }

  async function updateSelected(patch: Partial<Pick<Note, 'title' | 'content' | 'pinned'>>) {
    if (!selected) return;
    const updated = await window.asyncDesktop.notes.update(selected.id, patch);
    setNotes((current) => current.map((note) => (note.id === updated.id ? updated : note)));
  }

  async function removeSelected() {
    if (!selected) return;
    await window.asyncDesktop.notes.remove(selected.id);
    const next = notes.filter((note) => note.id !== selected.id);
    setNotes(next);
    setSelectedId(next[0]?.id ?? null);
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[280px_1fr] bg-[var(--surface)]">
      <aside className="flex min-h-0 flex-col border-r border-[var(--border)] bg-[var(--bg)]">
        <div className="border-b border-[var(--border)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold">Notes</h1>
              <p className="mt-0.5 text-[10px] text-[var(--faint)]">Local Markdown</p>
            </div>
            <button
              type="button"
              onClick={() => void createNote()}
              className="flex size-9 items-center justify-center rounded-xl bg-[var(--text)] text-[var(--bg)]"
              aria-label="Create note"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>
          <label className="flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3">
            <MagnifyingGlassIcon className="size-3.5 text-[var(--faint)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notes"
              aria-label="Search notes"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--faint)]"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setSelectedId(note.id)}
              className={cn(
                'mb-1 w-full rounded-xl px-3 py-3 text-left transition',
                selected?.id === note.id
                  ? 'bg-[var(--text)] text-[var(--bg)]'
                  : 'hover:bg-[var(--surface-raised)]'
              )}
            >
              <div className="flex items-center gap-1.5">
                {note.pinned && <PushPinIcon className="size-3" weight="fill" />}
                <span className="truncate text-xs font-semibold">{note.title}</span>
              </div>
              <p
                className={cn(
                  'mt-1 truncate text-[10px]',
                  selected?.id === note.id ? 'opacity-65' : 'text-[var(--faint)]'
                )}
              >
                {note.content || 'Empty note'} · {formatRelativeDate(note.updatedAt)}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-[var(--faint)]">No notes found.</p>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col">
        {selected ? (
          <>
            <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-5">
              <input
                value={selected.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setNotes((current) =>
                    current.map((note) => (note.id === selected.id ? { ...note, title } : note))
                  );
                }}
                onBlur={() => void updateSelected({ title: selected.title })}
                aria-label="Note title"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void updateSelected({ pinned: !selected.pinned })}
                  className="flex size-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                  aria-label={selected.pinned ? 'Unpin note' : 'Pin note'}
                >
                  <PushPinIcon className="size-4" weight={selected.pinned ? 'fill' : 'regular'} />
                </button>
                <button
                  type="button"
                  onClick={() => void removeSelected()}
                  className="flex size-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                  aria-label="Delete note"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            </div>
            <textarea
              value={selected.content}
              onChange={(event) => {
                const content = event.target.value;
                setNotes((current) =>
                  current.map((note) => (note.id === selected.id ? { ...note, content } : note))
                );
              }}
              onBlur={() => void updateSelected({ content: selected.content })}
              placeholder="Write in Markdown..."
              aria-label="Note content"
              className="min-h-0 flex-1 resize-none bg-transparent p-6 font-mono text-[13px] leading-7 outline-none placeholder:text-[var(--faint)]"
            />
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-5 py-3">
              <button
                type="button"
                onClick={() => onSendToAsync(`Help me with this note:\n\n${selected.content}`)}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--text)] px-3 text-[11px] font-semibold text-[var(--bg)]"
              >
                <ChatCircleIcon className="size-3.5" /> Send to ASYNC
              </button>
              <button
                type="button"
                onClick={() =>
                  onSendToAsync(
                    `Improve this note and explain the useful changes:\n\n${selected.content}`
                  )
                }
                className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[11px]"
              >
                <SparkleIcon className="size-3.5" /> Improve
              </button>
              <button
                type="button"
                onClick={() =>
                  onSendToAsync(`Summarize this note into study notes:\n\n${selected.content}`)
                }
                className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[11px]"
              >
                <NotePencilIcon className="size-3.5" /> Summarize
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-[var(--faint)]">
            <NotePencilIcon className="mb-3 size-7" />
            <p className="text-sm">Create a local Markdown note.</p>
          </div>
        )}
      </section>
    </div>
  );
}
