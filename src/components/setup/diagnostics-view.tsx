import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  CpuIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import type { AsyncDiagnostics, AsyncHealth } from '@/lib/contracts';

interface DiagnosticsViewProps {
  health: AsyncHealth;
  onRefreshHealth: () => Promise<void>;
  onSetup: () => void;
}

function StatusRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3.5 last:border-0">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
        {ready ? (
          <CheckCircleIcon className="size-4" weight="fill" />
        ) : (
          <WarningCircleIcon className="size-4" />
        )}
        {ready ? 'Available' : 'Unavailable'}
      </span>
    </div>
  );
}

export function DiagnosticsView({ health, onRefreshHealth, onSetup }: DiagnosticsViewProps) {
  const [diagnostics, setDiagnostics] = useState<AsyncDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await onRefreshHealth();
      setDiagnostics(await window.asyncDesktop.ai.diagnostics());
    } finally {
      setLoading(false);
    }
  }, [onRefreshHealth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="h-full overflow-y-auto px-6 py-7 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--faint)]">
              Technical details
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">Diagnostics</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Inspect the local engine without exposing raw errors in the main experience.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs hover:bg-[var(--surface-raised)]"
          >
            <ArrowClockwiseIcon className={loading ? 'size-4 animate-spin' : 'size-4'} /> Refresh
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--surface-raised)]">
              <CpuIcon className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">{health.message}</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {health.ready
                  ? 'Local generation is available.'
                  : 'Run setup or inspect the checks below.'}
              </p>
            </div>
          </div>
          {!health.ready && (
            <button
              type="button"
              onClick={onSetup}
              className="mt-5 h-10 rounded-xl bg-[var(--text)] px-4 text-xs font-semibold text-[var(--bg)]"
            >
              Run setup
            </button>
          )}
        </div>

        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <StatusRow label="Local runtime detected" ready={diagnostics?.runtimeDetected ?? false} />
          <StatusRow
            label="Local runtime reachable"
            ready={diagnostics?.runtimeReachable ?? false}
          />
          <StatusRow label="ASYNC model available" ready={diagnostics?.modelAvailable ?? false} />
        </section>

        {diagnostics && (
          <dl className="mt-5 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-[var(--faint)]">Logical model</dt>
              <dd className="mt-1 font-mono">{diagnostics.model}</dd>
            </div>
            <div>
              <dt className="text-[var(--faint)]">Platform</dt>
              <dd className="mt-1 font-mono">{diagnostics.platform}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[var(--faint)]">Local endpoint</dt>
              <dd className="mt-1 font-mono">{diagnostics.runtimeUrl}</dd>
            </div>
          </dl>
        )}

        <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
          The first release can detect and configure an existing local runtime. Automatic
          installation of the runtime itself is intentionally kept behind this service boundary for
          a future signed installer flow.
        </p>
      </div>
    </div>
  );
}
