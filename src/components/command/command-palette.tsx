import {
  ChatCircleIcon,
  ClockCounterClockwiseIcon,
  GearSixIcon,
  MagnifyingGlassIcon,
  NoteIcon,
  PencilLineIcon,
  TerminalWindowIcon,
  XIcon,
} from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ViewId } from '../shell/app-shell';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewId) => void;
  onPrompt: (prompt: string) => void;
}

const COMMANDS = [
  { label: 'New chat', icon: ChatCircleIcon, view: 'chat' as const },
  { label: 'Improve writing', icon: PencilLineIcon, view: 'writing' as const },
  { label: 'Explain selection', icon: ChatCircleIcon, prompt: 'Explain this clearly:' },
  { label: 'Explain code', icon: TerminalWindowIcon, prompt: 'Explain what this code does:' },
  { label: 'Debug an error', icon: TerminalWindowIcon, prompt: 'Help me debug this error:' },
  { label: 'Create note', icon: NoteIcon, view: 'notes' as const },
  { label: 'History', icon: ClockCounterClockwiseIcon, view: 'history' as const },
  { label: 'Settings', icon: GearSixIcon, view: 'settings' as const },
];

export function CommandPalette({ open, onClose, onNavigate, onPrompt }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();
  const commands = useMemo(
    () => COMMANDS.filter((command) => command.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function run(command: (typeof COMMANDS)[number]) {
    if ('prompt' in command && command.prompt) onPrompt(command.prompt);
    if ('view' in command && command.view) onNavigate(command.view);
    setQuery('');
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[100] flex items-start justify-center bg-black/55 px-4 pt-[12vh] backdrop-blur-sm"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/12 bg-[#0a0a0a] text-[#f3f3f3] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4">
              <MagnifyingGlassIcon className="size-4 text-[#858585]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') onClose();
                  if (event.key === 'Enter' && commands[0]) run(commands[0]);
                }}
                placeholder="Type a command..."
                aria-label="Search commands"
                className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-[#5f5f5f]"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close commands"
                className="flex size-8 items-center justify-center rounded-lg text-[#858585] hover:bg-white/8 hover:text-white"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto p-2">
              {commands.map((command, index) => {
                const Icon = command.icon;
                return (
                  <button
                    key={command.label}
                    type="button"
                    onClick={() => run(command)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[#aaaaaa] transition hover:bg-white/8 hover:text-white focus:bg-white/8 focus:text-white"
                  >
                    <Icon className="size-4" />
                    <span className="flex-1">{command.label}</span>
                    {index === 0 && query && (
                      <span className="text-[10px] text-[#5f5f5f]">Enter</span>
                    )}
                  </button>
                );
              })}
              {commands.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-[#6f6f6f]">No commands found.</p>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-[#5f5f5f]">
              <span>ASYNC commands</span>
              <span>Esc to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
