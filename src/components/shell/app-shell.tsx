import {
  ChatCircleIcon,
  ClockCounterClockwiseIcon,
  GearSixIcon,
  MinusIcon,
  NoteIcon,
  PencilLineIcon,
  PlusIcon,
  TerminalWindowIcon,
} from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { AsyncHealth } from '@/lib/contracts';
import { cn } from '@/lib/utils';
import { AsyncLogo } from '../brand/async-logo';

export type ViewId = 'chat' | 'writing' | 'notes' | 'history' | 'settings' | 'diagnostics';

interface AppShellProps {
  view: ViewId;
  health: AsyncHealth;
  children: ReactNode;
  onNavigate: (view: ViewId) => void;
  onNewChat: () => void;
  onOpenCommands: () => void;
}

const NAV_ITEMS = [
  { id: 'chat', label: 'Chat', icon: ChatCircleIcon },
  { id: 'writing', label: 'Writing', icon: PencilLineIcon },
  { id: 'notes', label: 'Notes', icon: NoteIcon },
  { id: 'history', label: 'History', icon: ClockCounterClockwiseIcon },
] satisfies Array<{ id: ViewId; label: string; icon: typeof ChatCircleIcon }>;

export function AppShell({
  view,
  health,
  children,
  onNavigate,
  onNewChat,
  onOpenCommands,
}: AppShellProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <header className="drag-region relative z-40 flex h-[66px] shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/92 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenCommands}
            className="no-drag flex size-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
            aria-label="Open command palette"
            title="Command palette (Ctrl+K)"
          >
            <TerminalWindowIcon className="size-4" />
          </button>
          <AsyncLogo wordmark />
          <div className="hidden items-center gap-2 border-l border-[var(--border)] pl-4 sm:flex">
            <span
              className={cn(
                'size-1.5 rounded-full',
                health.ready ? 'bg-[var(--text)]' : 'border border-[var(--muted)]'
              )}
            />
            <span className="text-[11px] font-medium text-[var(--muted)]">
              {health.ready ? 'Ready on this device' : 'Setup needed'}
            </span>
          </div>
        </div>

        <div className="no-drag flex items-center gap-1.5">
          <button
            type="button"
            onClick={onNewChat}
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition hover:bg-[var(--surface-raised)]"
          >
            <PlusIcon className="size-3.5" />
            New chat
          </button>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)] sm:flex"
          >
            <ClockCounterClockwiseIcon className="size-3.5" />
            History
          </button>
          <button
            type="button"
            onClick={() => void window.asyncDesktop.app.hide()}
            className="ml-1 flex size-9 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
            aria-label="Hide ASYNC"
            title="Hide ASYNC (Esc)"
          >
            <MinusIcon className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="z-30 flex w-[72px] shrink-0 flex-col items-center border-r border-[var(--border)] bg-[var(--bg)] py-3">
          <nav aria-label="Primary" className="flex flex-1 flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const selected = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-label={item.label}
                  aria-current={selected ? 'page' : undefined}
                  title={item.label}
                  className={cn(
                    'relative flex size-11 items-center justify-center rounded-xl transition',
                    selected
                      ? 'bg-[var(--text)] text-[var(--bg)]'
                      : 'text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
                  )}
                >
                  <Icon className="size-[18px]" weight={selected ? 'fill' : 'regular'} />
                </button>
              );
            })}
          </nav>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onNavigate('diagnostics')}
              aria-label="Diagnostics"
              title="Diagnostics"
              className={cn(
                'flex size-11 items-center justify-center rounded-xl transition',
                view === 'diagnostics'
                  ? 'bg-[var(--text)] text-[var(--bg)]'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
              )}
            >
              <TerminalWindowIcon className="size-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              aria-label="Settings"
              title="Settings"
              className={cn(
                'flex size-11 items-center justify-center rounded-xl transition',
                view === 'settings'
                  ? 'bg-[var(--text)] text-[var(--bg)]'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
              )}
            >
              <GearSixIcon className="size-[18px]" />
            </button>
          </div>
        </aside>
        <main className="relative min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
