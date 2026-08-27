import {
  BrainIcon,
  CheckCircleIcon,
  DatabaseIcon,
  GaugeIcon,
  KeyboardIcon,
  MicrophoneIcon,
  MonitorIcon,
  ShieldCheckIcon,
  SpinnerGapIcon,
  TrashIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import type { AppSettings, LocalModel } from '@/lib/contracts';

interface SettingsViewProps {
  settings: AppSettings;
  onSave: (patch: Partial<AppSettings>) => Promise<void>;
}

interface SettingRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="grid gap-4 border-b border-[var(--border)] px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(190px,auto)] sm:items-center sm:px-5">
      <div className="max-w-xl">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
      </div>
      <div className="flex min-w-0 items-center sm:justify-end">{children}</div>
    </div>
  );
}

interface SettingsSectionProps {
  icon: typeof MonitorIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingsSection({ icon: Icon, title, description, children }: SettingsSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_36px_rgba(0,0,0,0.08)]">
      <div className="flex items-start gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)]">
          <Icon className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

const controlClass =
  'field-control h-9 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs text-[var(--text)] outline-none sm:w-auto sm:min-w-48';

export function SettingsView({ settings, onSave }: SettingsViewProps) {
  const [shortcut, setShortcut] = useState(settings.globalShortcut);
  const [dataLocation, setDataLocation] = useState('Loading…');
  const [version, setVersion] = useState('0.2.0');
  const [models, setModels] = useState<LocalModel[]>([]);
  const [modelsError, setModelsError] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveResetTimer = useRef<number | null>(null);

  useEffect(() => {
    setShortcut(settings.globalShortcut);
  }, [settings.globalShortcut]);

  useEffect(() => {
    let disposed = false;
    try {
      setVersion(window.asyncDesktop.app.getVersion());
    } catch {
      setVersion('0.2.0');
    }
    void window.asyncDesktop.app
      .getDataLocation()
      .then((location) => {
        if (!disposed) setDataLocation(location);
      })
      .catch(() => {
        if (!disposed) setDataLocation('Local data directory unavailable');
      });
    void window.asyncDesktop.ai
      .models()
      .then((availableModels) => {
        if (disposed) return;
        setModels(availableModels);
        setModelsError(false);
      })
      .catch(() => {
        if (!disposed) setModelsError(true);
      });
    return () => {
      disposed = true;
      if (saveResetTimer.current !== null) window.clearTimeout(saveResetTimer.current);
    };
  }, []);

  async function save(patch: Partial<AppSettings>) {
    setSaveState('saving');
    try {
      await onSave(patch);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
    if (saveResetTimer.current !== null) window.clearTimeout(saveResetTimer.current);
    saveResetTimer.current = window.setTimeout(() => setSaveState('idle'), 2_200);
  }

  async function clearNotes() {
    if (!window.confirm('Remove all local notes? This cannot be undone.')) return;
    const notes = await window.asyncDesktop.notes.list();
    await Promise.all(notes.map((note) => window.asyncDesktop.notes.remove(note.id)));
  }

  async function clearHistory() {
    if (!window.confirm('Remove all local chat history? This cannot be undone.')) return;
    await window.asyncDesktop.history.clear();
  }

  const selectedModelAvailable =
    settings.selectedModel === 'auto' ||
    models.some((model) => model.name === settings.selectedModel);

  return (
    <div className="h-full overflow-y-auto px-5 py-7 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--faint)]">
              ASYNC desktop
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Settings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Control the interface, local response behavior, voice input, and private data.
            </p>
          </div>
          <div
            className="flex h-8 items-center gap-2 text-[11px] text-[var(--muted)]"
            aria-live="polite"
          >
            {saveState === 'saving' && <SpinnerGapIcon className="size-3.5 animate-spin" />}
            {saveState === 'saved' && <CheckCircleIcon className="size-3.5" weight="fill" />}
            {saveState === 'error' && <WarningCircleIcon className="size-3.5" />}
            {saveState === 'saving' && 'Saving…'}
            {saveState === 'saved' && 'Saved on this device'}
            {saveState === 'error' && 'Could not save settings'}
          </div>
        </div>

        <div className="space-y-5">
          <SettingsSection
            icon={MonitorIcon}
            title="App & appearance"
            description="Window behavior and the visual language used across ASYNC."
          >
            <SettingRow
              label="Launch at startup"
              description="Keep ASYNC available from the tray after sign-in."
            >
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.launchAtStartup}
                  onChange={(event) => void save({ launchAtStartup: event.target.checked })}
                  className="peer sr-only"
                  aria-label="Launch at startup"
                />
                <span className="h-6 w-11 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] transition after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-[var(--muted)] after:transition peer-checked:bg-[var(--text)] peer-checked:after:translate-x-5 peer-checked:after:bg-[var(--bg)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--focus-ring)]" />
              </label>
            </SettingRow>
            <SettingRow
              label="Global shortcut"
              description="Open ASYNC from anywhere on your system."
            >
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <KeyboardIcon className="size-4 shrink-0 text-[var(--muted)]" />
                <input
                  value={shortcut}
                  onChange={(event) => setShortcut(event.target.value)}
                  onBlur={() => void save({ globalShortcut: shortcut })}
                  aria-label="Global shortcut"
                  className={`${controlClass} font-mono`}
                />
              </div>
            </SettingRow>
            <SettingRow
              label="Interface language"
              description="Language used for product interface copy."
            >
              <select
                value={settings.language}
                onChange={(event) =>
                  void save({ language: event.target.value as AppSettings['language'] })
                }
                className={controlClass}
                aria-label="Interface language"
              >
                <option value="en">English</option>
                <option value="pt-BR">Português (Brasil)</option>
              </select>
            </SettingRow>
            <SettingRow label="Theme" description="Monochrome light, dark, or system appearance.">
              <select
                value={settings.theme}
                onChange={(event) =>
                  void save({ theme: event.target.value as AppSettings['theme'] })
                }
                className={controlClass}
                aria-label="Theme"
              >
                <option value="system">System</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </SettingRow>
          </SettingsSection>

          <SettingsSection
            icon={BrainIcon}
            title="Local intelligence"
            description="Choose an installed model and tune how much work ASYNC spends on each answer."
          >
            <SettingRow
              label="Model"
              description="Automatic keeps the stable ASYNC model; installed Ollama models can be selected explicitly."
            >
              <select
                value={settings.selectedModel}
                onChange={(event) => void save({ selectedModel: event.target.value })}
                className={controlClass}
                aria-label="Local model"
              >
                <option value="auto">Automatic (ASYNC)</option>
                {!selectedModelAvailable && (
                  <option value={settings.selectedModel}>{settings.selectedModel}</option>
                )}
                {models.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name.replace(/:latest$/, '')}
                    {model.parameterSize ? ` · ${model.parameterSize}` : ''}
                  </option>
                ))}
              </select>
            </SettingRow>
            <SettingRow
              label="Effort"
              description="Low is best for quick questions; high enables deeper local reasoning for complex work."
            >
              <select
                value={settings.chatEffort}
                onChange={(event) =>
                  void save({ chatEffort: event.target.value as AppSettings['chatEffort'] })
                }
                className={controlClass}
                aria-label="Chat effort"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </SettingRow>
            <SettingRow
              label="Speed"
              description="Fast reduces context and answer budget; normal preserves more depth when needed."
            >
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <GaugeIcon className="size-4 shrink-0 text-[var(--muted)]" />
                <select
                  value={settings.chatSpeed}
                  onChange={(event) =>
                    void save({ chatSpeed: event.target.value as AppSettings['chatSpeed'] })
                  }
                  className={controlClass}
                  aria-label="Chat speed"
                >
                  <option value="normal">Normal</option>
                  <option value="fast">Fast</option>
                </select>
              </div>
            </SettingRow>
            <SettingRow
              label="Response detail"
              description="Choose how compact or thorough answers should be."
            >
              <select
                value={settings.responseDetail}
                onChange={(event) =>
                  void save({ responseDetail: event.target.value as AppSettings['responseDetail'] })
                }
                className={controlClass}
                aria-label="Response detail"
              >
                <option value="concise">Concise</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
              </select>
            </SettingRow>
            <SettingRow
              label="Learning style"
              description="Guide answers toward hints, examples, or questions."
            >
              <select
                value={settings.learningStyle}
                onChange={(event) =>
                  void save({ learningStyle: event.target.value as AppSettings['learningStyle'] })
                }
                className={controlClass}
                aria-label="Learning style"
              >
                <option value="guided">Guided</option>
                <option value="examples">Examples</option>
                <option value="socratic">Ask me questions</option>
              </select>
            </SettingRow>
            <SettingRow
              label="Code experience"
              description="Adapt terminology and technical depth."
            >
              <select
                value={settings.codeExperience}
                onChange={(event) =>
                  void save({ codeExperience: event.target.value as AppSettings['codeExperience'] })
                }
                className={controlClass}
                aria-label="Code experience"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </SettingRow>
            {modelsError && (
              <div className="flex items-center gap-2 px-5 py-3 text-xs text-[var(--muted)]">
                <WarningCircleIcon className="size-4 shrink-0" />
                Start the local runtime to refresh the installed model list.
              </div>
            )}
          </SettingsSection>

          <SettingsSection
            icon={MicrophoneIcon}
            title="Voice input"
            description="Speech is transcribed into the composer; audio is never saved in ASYNC notes or history."
          >
            <SettingRow
              label="Recognition language"
              description="Automatic follows the system language. You can switch languages from the globe button in chat."
            >
              <select
                value={settings.speechLanguage}
                onChange={(event) =>
                  void save({ speechLanguage: event.target.value as AppSettings['speechLanguage'] })
                }
                className={controlClass}
                aria-label="Speech recognition language"
              >
                <option value="auto">Automatic (system)</option>
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
                <option value="fr-FR">Français</option>
                <option value="de-DE">Deutsch</option>
                <option value="it-IT">Italiano</option>
              </select>
            </SettingRow>
          </SettingsSection>

          <SettingsSection
            icon={DatabaseIcon}
            title="Privacy & data"
            description="Notes, settings, and conversation history remain separate and local."
          >
            <SettingRow label="Data location" description="Folder used for local ASYNC data.">
              <span
                className="max-w-full truncate rounded-lg bg-[var(--surface-raised)] px-3 py-2 font-mono text-[10px] text-[var(--muted)] sm:max-w-sm"
                title={dataLocation}
              >
                {dataLocation}
              </span>
            </SettingRow>
            <SettingRow
              label="Clear chat history"
              description="Permanently remove all locally stored conversations."
            >
              <button
                type="button"
                onClick={() => void clearHistory()}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
              >
                <TrashIcon className="size-3.5" /> Clear history
              </button>
            </SettingRow>
            <SettingRow
              label="Clear notes"
              description="Permanently remove every local Markdown note."
            >
              <button
                type="button"
                onClick={() => void clearNotes()}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
              >
                <TrashIcon className="size-3.5" /> Clear notes
              </button>
            </SettingRow>
          </SettingsSection>

          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-3 text-[10px] text-[var(--faint)]">
            <span className="flex items-center gap-1.5">
              <ShieldCheckIcon className="size-3.5" /> Local-first settings
            </span>
            <span>ASYNC v{version}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
