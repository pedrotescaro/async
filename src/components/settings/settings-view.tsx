import {
  DatabaseIcon,
  KeyboardIcon,
  MonitorIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { AppSettings } from '@/lib/contracts';

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
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4 last:border-b-0">
      <div className="max-w-md">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
      </div>
      {children}
    </div>
  );
}

const controlClass =
  'field-control h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs outline-none';

export function SettingsView({ settings, onSave }: SettingsViewProps) {
  const [shortcut, setShortcut] = useState(settings.globalShortcut);
  const [dataLocation, setDataLocation] = useState('Loading...');
  const version = window.asyncDesktop.app.getVersion();

  useEffect(() => {
    setShortcut(settings.globalShortcut);
  }, [settings.globalShortcut]);

  useEffect(() => {
    void window.asyncDesktop.app.getDataLocation().then(setDataLocation);
  }, []);

  async function clearNotes() {
    const notes = await window.asyncDesktop.notes.list();
    await Promise.all(notes.map((note) => window.asyncDesktop.notes.remove(note.id)));
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-7 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-7">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--faint)]">
            Preferences
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Settings</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Useful controls only. ASYNC has no provider or API key settings.
          </p>
        </div>

        <section className="mb-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <MonitorIcon className="size-4" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em]">General</h2>
          </div>
          <SettingRow
            label="Launch at startup"
            description="Keep ASYNC available from the tray after sign-in."
          >
            <input
              type="checkbox"
              checked={settings.launchAtStartup}
              onChange={(event) => void onSave({ launchAtStartup: event.target.checked })}
              className="checkbox-control size-4 accent-[var(--text)]"
              aria-label="Launch at startup"
            />
          </SettingRow>
          <SettingRow
            label="Global shortcut"
            description="Open ASYNC from anywhere on your system."
          >
            <div className="flex items-center gap-2">
              <KeyboardIcon className="size-4 text-[var(--muted)]" />
              <input
                value={shortcut}
                onChange={(event) => setShortcut(event.target.value)}
                onBlur={() => void onSave({ globalShortcut: shortcut })}
                aria-label="Global shortcut"
                className={`${controlClass} w-36 font-mono`}
              />
            </div>
          </SettingRow>
          <SettingRow label="Language" description="Language for product interface copy.">
            <select
              value={settings.language}
              onChange={(event) =>
                void onSave({ language: event.target.value as AppSettings['language'] })
              }
              className={controlClass}
              aria-label="Language"
            >
              <option value="en">English</option>
              <option value="pt-BR">Português (Brasil)</option>
            </select>
          </SettingRow>
          <SettingRow label="Theme" description="Black, white, and neutral tones in either mode.">
            <select
              value={settings.theme}
              onChange={(event) =>
                void onSave({ theme: event.target.value as AppSettings['theme'] })
              }
              className={controlClass}
              aria-label="Theme"
            >
              <option value="system">System</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </SettingRow>
        </section>

        <section className="mb-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <ShieldCheckIcon className="size-4" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em]">ASYNC</h2>
          </div>
          <SettingRow
            label="Response detail"
            description="Choose how compact or thorough answers should be."
          >
            <select
              value={settings.responseDetail}
              onChange={(event) =>
                void onSave({ responseDetail: event.target.value as AppSettings['responseDetail'] })
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
                void onSave({ learningStyle: event.target.value as AppSettings['learningStyle'] })
              }
              className={controlClass}
              aria-label="Learning style"
            >
              <option value="guided">Guided</option>
              <option value="examples">Examples</option>
              <option value="socratic">Ask me questions</option>
            </select>
          </SettingRow>
          <SettingRow label="Code experience" description="Adapt terminology and technical depth.">
            <select
              value={settings.codeExperience}
              onChange={(event) =>
                void onSave({ codeExperience: event.target.value as AppSettings['codeExperience'] })
              }
              className={controlClass}
              aria-label="Code experience"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </SettingRow>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <DatabaseIcon className="size-4" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em]">Privacy & data</h2>
          </div>
          <SettingRow
            label="Data location"
            description="App data, notes, and history remain separated inside this folder."
          >
            <span
              className="max-w-xs truncate rounded-lg bg-[var(--surface-raised)] px-3 py-2 font-mono text-[10px] text-[var(--muted)]"
              title={dataLocation}
            >
              {dataLocation}
            </span>
          </SettingRow>
          <SettingRow
            label="Clear chat history"
            description="Remove all locally stored conversations."
          >
            <button
              type="button"
              onClick={() => void window.asyncDesktop.history.clear()}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
            >
              <TrashIcon className="size-3.5" /> Clear history
            </button>
          </SettingRow>
          <SettingRow
            label="Clear notes"
            description="Permanently remove all local Markdown notes."
          >
            <button
              type="button"
              onClick={() => void clearNotes()}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
            >
              <TrashIcon className="size-3.5" /> Clear notes
            </button>
          </SettingRow>
        </section>

        <p className="mt-5 text-center text-[10px] text-[var(--faint)]">
          ASYNC v{version} · Open source · Local-first
        </p>
      </div>
    </div>
  );
}
