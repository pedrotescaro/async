import { ArrowUpIcon, FileCodeIcon, PaperclipIcon, SquareIcon, XIcon } from '@phosphor-icons/react';
import { type ChangeEvent, type KeyboardEvent, useRef } from 'react';

export interface ComposerAttachment {
  id: string;
  name: string;
  content: string;
}

interface ChatComposerProps {
  value: string;
  attachments: ComposerAttachment[];
  busy: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onAttachmentsChange: (attachments: ComposerAttachment[]) => void;
  onSend: () => void;
  onStop: () => void;
}

const MAX_ATTACHMENTS = 4;
const MAX_FILE_SIZE = 1024 * 1024;

export function ChatComposer({
  value,
  attachments,
  busy,
  disabled,
  onChange,
  onAttachmentsChange,
  onSend,
  onStop,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    if (!busy) onSend();
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])].slice(0, MAX_ATTACHMENTS - attachments.length);
    const next = await Promise.all(
      files
        .filter((file) => file.size <= MAX_FILE_SIZE)
        .map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          content: await file.text(),
        }))
    );
    onAttachmentsChange([...attachments, ...next]);
    event.target.value = '';
  }

  return (
    <div className="rounded-[22px] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[0_22px_65px_rgba(0,0,0,0.18)] transition focus-within:border-[var(--text)]/35">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {attachments.map((attachment) => (
            <span
              key={attachment.id}
              className="inline-flex max-w-[220px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-[11px] text-[var(--muted)]"
            >
              <FileCodeIcon className="size-3.5 shrink-0" />
              <span className="truncate">{attachment.name}</span>
              <button
                type="button"
                onClick={() =>
                  onAttachmentsChange(attachments.filter((item) => item.id !== attachment.id))
                }
                aria-label={`Remove ${attachment.name}`}
                className="ml-1 rounded p-0.5 hover:bg-[var(--border)] hover:text-[var(--text)]"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={3}
        maxLength={100_000}
        placeholder="Ask, paste, or write anything..."
        aria-label="Message ASYNC"
        className="block max-h-48 min-h-[86px] w-full resize-none bg-transparent px-4 pb-2 pt-4 text-[15px] leading-6 text-[var(--text)] outline-none placeholder:text-[var(--faint)] disabled:opacity-60"
      />
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.js,.jsx,.ts,.tsx,.py,.rs,.go,.java,.json,.css,.html,.sql,.sh,.yml,.yaml"
            onChange={handleFiles}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || attachments.length >= MAX_ATTACHMENTS}
            aria-label="Attach code or text file"
            title="Attach code or text"
            className="flex size-9 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40"
          >
            <PaperclipIcon className="size-[17px]" />
          </button>
          <span className="hidden text-[10px] text-[var(--faint)] sm:inline">Powered by ASYNC</span>
        </div>
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generation"
            className="flex size-9 items-center justify-center rounded-xl bg-[var(--text)] text-[var(--bg)]"
          >
            <SquareIcon className="size-3.5" weight="fill" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={disabled || (!value.trim() && attachments.length === 0)}
            aria-label="Send message"
            className="flex size-9 items-center justify-center rounded-xl bg-[var(--text)] text-[var(--bg)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25"
          >
            <ArrowUpIcon className="size-4" weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
}
