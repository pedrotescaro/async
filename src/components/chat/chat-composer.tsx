import {
  ArrowUpIcon,
  CheckIcon,
  FileCodeIcon,
  GlobeHemisphereWestIcon,
  PlusIcon,
  SquareIcon,
  XIcon,
} from '@phosphor-icons/react';
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { AppSettings, SpeechLanguage } from '@/lib/contracts';
import { cn } from '@/lib/utils';
import { ChatModeMenu } from './chat-mode-menu';
import { VoiceInput } from './voice-input';

export interface ComposerAttachment {
  id: string;
  name: string;
  content: string;
}

interface ChatComposerProps {
  value: string;
  attachments: ComposerAttachment[];
  busy: boolean;
  settings: AppSettings;
  disabled?: boolean;
  onChange: (value: string) => void;
  onAttachmentsChange: (attachments: ComposerAttachment[]) => void;
  onSettingsChange: (patch: Partial<AppSettings>) => Promise<void>;
  onSend: () => void;
  onStop: () => void;
}

const MAX_ATTACHMENTS = 4;
const MAX_FILE_SIZE = 1024 * 1024;

const SPEECH_LANGUAGES: Array<{ value: SpeechLanguage; label: string; shortLabel: string }> = [
  { value: 'auto', label: 'Automático (idioma do sistema)', shortLabel: 'Auto' },
  { value: 'pt-BR', label: 'Português (Brasil)', shortLabel: 'PT' },
  { value: 'en-US', label: 'English (US)', shortLabel: 'EN' },
  { value: 'es-ES', label: 'Español', shortLabel: 'ES' },
  { value: 'fr-FR', label: 'Français', shortLabel: 'FR' },
  { value: 'de-DE', label: 'Deutsch', shortLabel: 'DE' },
  { value: 'it-IT', label: 'Italiano', shortLabel: 'IT' },
];

export function ChatComposer({
  value,
  attachments,
  busy,
  settings,
  disabled,
  onChange,
  onAttachmentsChange,
  onSettingsChange,
  onSend,
  onStop,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (value.length === 0) textarea.scrollTop = 0;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 64), 192)}px`;
  }, [value]);

  useEffect(() => {
    if (!languageMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) setLanguageMenuOpen(false);
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setLanguageMenuOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [languageMenuOpen]);

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

  const speechLanguage =
    SPEECH_LANGUAGES.find((language) => language.value === settings.speechLanguage) ??
    SPEECH_LANGUAGES[0];
  const placeholder = settings.language === 'pt-BR' ? 'Pergunte qualquer coisa…' : 'Ask anything…';

  return (
    <div className="composer-frame relative rounded-[22px] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[0_22px_65px_rgba(0,0,0,0.2)]">
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
                aria-label={`Remover ${attachment.name}`}
                className="ml-1 rounded p-0.5 hover:bg-[var(--border)] hover:text-[var(--text)]"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        maxLength={100_000}
        placeholder={placeholder}
        aria-label="Mensagem para o ASYNC"
        className="block max-h-48 min-h-16 w-full resize-none overflow-y-auto bg-transparent px-4 pb-2 pt-4 text-[15px] leading-6 text-[var(--text)] outline-none placeholder:text-[var(--faint)] disabled:opacity-60"
      />

      <div className="flex min-w-0 items-center justify-between gap-2 px-2.5 pb-2.5 pt-1">
        <div className="flex min-w-0 items-center gap-0.5">
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
            aria-label="Adicionar arquivo de texto ou código"
            title="Adicionar arquivo"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40"
          >
            <PlusIcon className="size-[17px]" />
          </button>

          <div ref={languageMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setLanguageMenuOpen((current) => !current)}
              disabled={busy}
              aria-haspopup="menu"
              aria-expanded={languageMenuOpen}
              aria-label={`Idioma da voz: ${speechLanguage.label}`}
              title={`Idioma da voz: ${speechLanguage.label}`}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1 rounded-xl px-2 text-[11px] text-[var(--muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40',
                languageMenuOpen && 'bg-[var(--surface-raised)] text-[var(--text)]'
              )}
            >
              <GlobeHemisphereWestIcon className="size-[17px]" />
              <span className="hidden font-medium sm:inline">{speechLanguage.shortLabel}</span>
            </button>
            {languageMenuOpen && (
              <div
                role="menu"
                aria-label="Idioma para reconhecimento de voz"
                className="absolute bottom-12 left-0 z-50 w-64 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-2 shadow-[0_18px_55px_rgba(0,0,0,0.4)]"
              >
                <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--faint)]">
                  Idioma da voz
                </p>
                {SPEECH_LANGUAGES.map((language) => (
                  <button
                    key={language.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={settings.speechLanguage === language.value}
                    onClick={() => {
                      void onSettingsChange({ speechLanguage: language.value });
                      setLanguageMenuOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition',
                      settings.speechLanguage === language.value
                        ? 'bg-[var(--surface-raised)] text-[var(--text)]'
                        : 'text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
                    )}
                  >
                    <span className="flex-1">{language.label}</span>
                    {settings.speechLanguage === language.value && (
                      <CheckIcon className="size-3.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1">
          <ChatModeMenu
            selectedModel={settings.selectedModel}
            effort={settings.chatEffort}
            speed={settings.chatSpeed}
            disabled={busy}
            onChange={onSettingsChange}
          />
          <VoiceInput
            language={settings.speechLanguage}
            disabled={disabled || busy}
            onTranscript={(transcript) =>
              onChange(value.trim() ? `${value.trimEnd()} ${transcript}` : transcript)
            }
          />
          <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-[var(--border)]" />
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Parar geração"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--text)] text-[var(--bg)] hover:opacity-85"
            >
              <SquareIcon className="size-3.5" weight="fill" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={disabled || (!value.trim() && attachments.length === 0)}
              aria-label="Enviar mensagem"
              title="Enviar (Enter)"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--text)] text-[var(--bg)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25"
            >
              <ArrowUpIcon className="size-4" weight="bold" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
