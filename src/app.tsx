import '@/lib/browser-fallback';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { AppSettings, AsyncHealth, HistoryItem, SetupProgress } from '@/lib/contracts';
import { DEFAULT_APP_SETTINGS } from '@/lib/contracts';
import { ChatView, type ConversationSeed } from './components/chat/chat-view';
import { CommandPalette } from './components/command/command-palette';
import { AppShell, type ViewId } from './components/shell/app-shell';

const WritingView = lazy(() =>
  import('./components/writing/writing-view').then((module) => ({ default: module.WritingView }))
);
const NotesView = lazy(() =>
  import('./components/notes/notes-view').then((module) => ({ default: module.NotesView }))
);
const HistoryView = lazy(() =>
  import('./components/history/history-view').then((module) => ({ default: module.HistoryView }))
);
const SettingsView = lazy(() =>
  import('./components/settings/settings-view').then((module) => ({ default: module.SettingsView }))
);
const DiagnosticsView = lazy(() =>
  import('./components/setup/diagnostics-view').then((module) => ({
    default: module.DiagnosticsView,
  }))
);
const SetupView = lazy(() =>
  import('./components/setup/setup-view').then((module) => ({ default: module.SetupView }))
);

const CHECKING_HEALTH: AsyncHealth = {
  status: 'checking',
  ready: false,
  message: 'Checking ASYNC...',
};

function ViewFallback() {
  return (
    <output className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
      Loading ASYNC...
    </output>
  );
}

function applyTheme(theme: AppSettings['theme']): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const update = () => {
    const dark = theme === 'dark' || (theme === 'system' && media.matches);
    document.documentElement.classList.toggle('dark', dark);
  };
  update();
  media.addEventListener('change', update);
  return () => media.removeEventListener('change', update);
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [health, setHealth] = useState<AsyncHealth>(CHECKING_HEALTH);
  const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [view, setView] = useState<ViewId>('chat');
  const [draft, setDraft] = useState('');
  const [writingContent, setWritingContent] = useState('');
  const [conversationSeed, setConversationSeed] = useState<ConversationSeed>({ messages: [] });
  const [conversationRevision, setConversationRevision] = useState(0);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [commandsOpen, setCommandsOpen] = useState(false);

  const handleHistorySaved = useCallback(() => {
    setHistoryRevision((revision) => revision + 1);
  }, []);

  const refreshHealth = useCallback(async () => {
    setHealth(await window.asyncDesktop.ai.health());
  }, []);

  useEffect(() => {
    void Promise.all([window.asyncDesktop.settings.get(), window.asyncDesktop.ai.health()]).then(
      ([loadedSettings, loadedHealth]) => {
        setSettings(loadedSettings);
        setHealth(loadedHealth);
        setShowSetup(!loadedHealth.ready && !loadedSettings.setupDismissed);
      }
    );
    const unsubscribeSetup = window.asyncDesktop.ai.onSetupProgress((progress) => {
      setSetupProgress(progress);
      if (progress.stage === 'ready')
        setHealth({ status: 'ready', ready: true, message: 'ASYNC is ready.' });
    });
    const unsubscribeSelection = window.asyncDesktop.app.onSelection((selection) => {
      setDraft(selection.text);
      setConversationSeed({ messages: [] });
      setConversationRevision((revision) => revision + 1);
      setView('chat');
    });
    return () => {
      unsubscribeSetup();
      unsubscribeSelection();
    };
  }, []);

  useEffect(() => {
    if (!settings) return;
    return applyTheme(settings.theme);
  }, [settings]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandsOpen((open) => !open);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setDraft('');
        setConversationSeed({ messages: [] });
        setConversationRevision((revision) => revision + 1);
        setView('chat');
        return;
      }
      if (event.key !== 'Escape') return;
      if (commandsOpen) {
        setCommandsOpen(false);
        return;
      }
      if (view !== 'chat') {
        setView('chat');
        return;
      }
      void window.asyncDesktop.app.hide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandsOpen, view]);

  function startNewChat(prefill = '') {
    setDraft(prefill);
    setConversationSeed({ messages: [] });
    setConversationRevision((revision) => revision + 1);
    setView('chat');
  }

  function continueConversation(item: HistoryItem) {
    setConversationSeed({ id: item.id, messages: item.messages, task: item.task });
    setConversationRevision((revision) => revision + 1);
    setView('chat');
  }

  async function saveSettings(patch: Partial<AppSettings>) {
    setSettings(await window.asyncDesktop.settings.save(patch));
  }

  async function continueFromSetup() {
    const current = settings ?? DEFAULT_APP_SETTINGS;
    const updated = await window.asyncDesktop.settings.save({ setupDismissed: true });
    setSettings({ ...current, ...updated });
    setShowSetup(false);
  }

  function runSetup() {
    setSetupProgress({
      stage: 'checking',
      label: 'Checking the local intelligence engine...',
      progress: 2,
    });
    void window.asyncDesktop.ai.setup().then(() => void refreshHealth());
  }

  if (!settings) {
    return (
      <div className="flex h-full items-center justify-center bg-[#030303] text-sm text-[#858585]">
        Checking ASYNC...
      </div>
    );
  }

  if (showSetup) {
    return (
      <Suspense fallback={<ViewFallback />}>
        <SetupView
          health={health}
          progress={setupProgress}
          onSetup={runSetup}
          onContinue={() => void continueFromSetup()}
        />
      </Suspense>
    );
  }

  return (
    <AppShell
      view={view}
      health={health}
      onNavigate={setView}
      onNewChat={() => startNewChat()}
      onOpenCommands={() => setCommandsOpen(true)}
    >
      <Suspense fallback={<ViewFallback />}>
        {view === 'chat' && (
          <ChatView
            key={conversationRevision}
            settings={settings}
            draft={draft}
            seed={conversationSeed}
            engineReady={health.ready}
            onDraftChange={setDraft}
            onHistorySaved={handleHistorySaved}
            onOpenDiagnostics={() => setView('diagnostics')}
          />
        )}
        {view === 'writing' && (
          <WritingView
            initialContent={writingContent}
            onInitialContentChange={setWritingContent}
            onAskWhy={(prompt) => startNewChat(prompt)}
            onOpenDiagnostics={() => setView('diagnostics')}
          />
        )}
        {view === 'notes' && <NotesView onSendToAsync={(prompt) => startNewChat(prompt)} />}
        {view === 'history' && (
          <HistoryView key={historyRevision} onContinue={continueConversation} />
        )}
        {view === 'settings' && <SettingsView settings={settings} onSave={saveSettings} />}
        {view === 'diagnostics' && (
          <DiagnosticsView
            health={health}
            onRefreshHealth={refreshHealth}
            onSetup={() => setShowSetup(true)}
          />
        )}
      </Suspense>
      <CommandPalette
        open={commandsOpen}
        onClose={() => setCommandsOpen(false)}
        onNavigate={setView}
        onPrompt={(prompt) => startNewChat(prompt)}
      />
    </AppShell>
  );
}
