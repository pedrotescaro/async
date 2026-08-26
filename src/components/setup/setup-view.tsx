import {
  ArrowRightIcon,
  CheckIcon,
  CpuIcon,
  DownloadSimpleIcon,
  SpinnerGapIcon,
} from '@phosphor-icons/react';
import type { AsyncHealth, SetupProgress } from '@/lib/contracts';
import { AsyncLogo } from '../brand/async-logo';
import { MonochromeParticles } from '../ui/monochrome-particles';

interface SetupViewProps {
  health: AsyncHealth;
  progress: SetupProgress | null;
  onSetup: () => void;
  onContinue: () => void;
}

const STEPS = [
  { id: 'checking', label: 'Checking this device', icon: CpuIcon },
  { id: 'downloading', label: 'Downloading the intelligence engine', icon: DownloadSimpleIcon },
  { id: 'creating', label: 'Preparing ASYNC', icon: SpinnerGapIcon },
  { id: 'ready', label: 'Ready to learn and build', icon: CheckIcon },
];

const STAGE_INDEX: Record<SetupProgress['stage'], number> = {
  checking: 0,
  'starting-runtime': 0,
  downloading: 1,
  creating: 2,
  verifying: 2,
  ready: 3,
  error: 0,
};

export function SetupView({ health, progress, onSetup, onContinue }: SetupViewProps) {
  const activeIndex = progress ? STAGE_INDEX[progress.stage] : 0;
  const running = Boolean(progress && !['ready', 'error'].includes(progress.stage));

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-[#030303] px-6 text-[#f3f3f3]">
      <MonochromeParticles />
      <div className="relative z-10 grid w-full max-w-4xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <AsyncLogo
            wordmark
            className="mb-10 [&_img:first-child]:hidden [&_img:last-child]:block"
          />
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#777777]">
            First-time setup
          </p>
          <h1 className="max-w-lg text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Setting up ASYNC
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[#8b8b8b]">
            ASYNC prepares its local intelligence on this device. No API keys, provider screens, or
            account required.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSetup}
              disabled={running || health.ready}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-[#dfdfdf] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? (
                <SpinnerGapIcon className="size-4 animate-spin" />
              ) : (
                <CpuIcon className="size-4" />
              )}
              {health.ready ? 'ASYNC is ready' : running ? 'Preparing ASYNC...' : 'Set up ASYNC'}
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/14 px-5 text-sm font-medium text-[#aaaaaa] transition hover:border-white/25 hover:text-white"
            >
              Continue to the app
              <ArrowRightIcon className="size-4" />
            </button>
          </div>
          {progress?.stage === 'error' && (
            <p role="alert" className="mt-4 max-w-lg text-sm text-[#b2b2b2]">
              {progress.label} You can continue into the app and open Diagnostics for technical
              details.
            </p>
          )}
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-2 shadow-2xl">
          <div className="rounded-[20px] border border-white/8 bg-[#080808] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm font-medium">Local setup</span>
              <span className="text-[11px] text-[#666666]">Powered by ASYNC</span>
            </div>
            <div className="space-y-2">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const done = index < activeIndex || progress?.stage === 'ready';
                const active = index === activeIndex && progress?.stage !== 'error';
                return (
                  <div
                    key={step.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-3"
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035]">
                      {done ? (
                        <CheckIcon className="size-4 text-white" weight="bold" />
                      ) : (
                        <Icon className={active && running ? 'size-4 animate-pulse' : 'size-4'} />
                      )}
                    </span>
                    <span
                      className={done || active ? 'text-sm text-white' : 'text-sm text-[#5f5f5f]'}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-500"
                style={{ width: `${progress?.progress ?? (health.ready ? 100 : 3)}%` }}
              />
            </div>
            <p className="mt-3 min-h-4 text-[11px] text-[#777777]">
              {progress?.label ?? health.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
