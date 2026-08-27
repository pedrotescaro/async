import {
  ArrowsInSimpleIcon,
  ArrowsOutSimpleIcon,
  ChatCircleIcon,
  ClockCounterClockwiseIcon,
  CornersInIcon,
  CornersOutIcon,
  GearSixIcon,
  MinusIcon,
  NoteIcon,
  PencilLineIcon,
  PlusIcon,
  TerminalWindowIcon,
} from '@phosphor-icons/react';
import { type ReactNode, useEffect, useState } from 'react';
import type { AsyncHealth, DesktopWindowState } from '@/lib/contracts';
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

const VIEW_TITLES: Record<ViewId, string> = {
  chat: 'Chat',
  writing: 'Writing',
  notes: 'Notes',
  history: 'History',
  settings: 'Settings',
  diagnostics: 'Diagnostics',
};

const INITIAL_WINDOW_STATE: DesktopWindowState = { maximized: false, fullScreen: false };

export function AppShell({
  view,
  health,
  children,
  onNavigate,
  onNewChat,
  onOpenCommands,
}: AppShellProps) {
  const [windowState, setWindowState] = useState<DesktopWindowState>(INITIAL_WINDOW_STATE);

  useEffect(() => {
    let disposed = false;
    void window.asyncDesktop.app
      .getWindowState()
      .then((state) => {
        if (!disposed) setWindowState(state);
      })
      .catch(() => undefined);
    const unsubscribe = window.asyncDesktop.app.onWindowState(setWindowState);
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  const navButtonClass = (selected: boolean) =>
    cn(
      'flex h-10 w-full items-center justify-center gap-3 rounded-xl px-3 text-sm transition lg:justify-start',
      selected
        ? 'bg-[var(--surface-raised)] font-medium text-[var(--text)]'
        : 'text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
    );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <header className="drag-region relative z-40 flex h-[54px] shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/94 px-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <AsyncLogo wordmark />
          <span aria-hidden="true" className="hidden h-4 w-px bg-[var(--border)] sm:block" />
          <span className="hidden truncate text-xs text-[var(--muted)] sm:block">
            {VIEW_TITLES[view]}
          </span>
        </div>

        <div className="no-drag flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => void window.asyncDesktop.app.toggleFullScreen().then(setWindowState)}
            className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
            aria-label={windowState.fullScreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
            title={windowState.fullScreen ? 'Sair da tela cheia (F11)' : 'Tela cheia (F11)'}
          >
            {windowState.fullScreen ? (
              <CornersInIcon className="size-4" />
            ) : (
              <CornersOutIcon className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => void window.asyncDesktop.app.toggleMaximize().then(setWindowState)}
            className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
            aria-label={windowState.maximized ? 'Restaurar janela' : 'Maximizar janela'}
            title={windowState.maximized ? 'Restaurar janela' : 'Maximizar janela'}
          >
            {windowState.maximized ? (
              <ArrowsInSimpleIcon className="size-4" />
            ) : (
              <ArrowsOutSimpleIcon className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => void window.asyncDesktop.app.hide()}
            className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
            aria-label="Ocultar ASYNC"
            title="Ocultar ASYNC (Esc)"
          >
            <MinusIcon className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="z-30 flex w-[68px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]/35 px-2 py-3 lg:w-[220px] lg:px-3">
          <button
            type="button"
            onClick={onNewChat}
            className="mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium shadow-sm transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] lg:justify-start"
            aria-label="Novo chat"
            title="Novo chat (Ctrl+N)"
          >
            <PlusIcon className="size-4 shrink-0" />
            <span className="hidden lg:inline">New chat</span>
          </button>

          <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
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
                  className={navButtonClass(selected)}
                >
                  <Icon className="size-[18px] shrink-0" weight={selected ? 'fill' : 'regular'} />
                  <span className="hidden truncate lg:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mb-2 hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)]/45 px-3 py-2.5 lg:flex">
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                health.ready ? 'bg-[var(--text)]' : 'border border-[var(--muted)]'
              )}
            />
            <span className="truncate text-[10px] text-[var(--muted)]">
              {health.ready ? 'Ready on this device' : 'Local setup needed'}
            </span>
          </div>

          <div className="flex flex-col gap-1 border-t border-[var(--border)] pt-2">
            <button
              type="button"
              onClick={onOpenCommands}
              aria-label="Command palette"
              title="Command palette (Ctrl+K)"
              className={navButtonClass(false)}
            >
              <TerminalWindowIcon className="size-[18px] shrink-0" />
              <span className="hidden truncate lg:inline">Commands</span>
              <kbd className="ml-auto hidden rounded border border-[var(--border)] px-1.5 py-0.5 text-[9px] text-[var(--faint)] lg:block">
                Ctrl K
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('diagnostics')}
              aria-label="Diagnostics"
              title="Diagnostics"
              className={navButtonClass(view === 'diagnostics')}
            >
              <TerminalWindowIcon className="size-[18px] shrink-0" />
              <span className="hidden truncate lg:inline">Diagnostics</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              aria-label="Settings"
              title="Settings"
              className={navButtonClass(view === 'settings')}
            >
              <GearSixIcon className="size-[18px] shrink-0" />
              <span className="hidden truncate lg:inline">Settings</span>
            </button>
          </div>
        </aside>
        <main className="relative min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
