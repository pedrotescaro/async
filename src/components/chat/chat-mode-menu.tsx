import {
  ArrowCounterClockwiseIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  GaugeIcon,
  MinusIcon,
  SparkleIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AppSettings, ChatEffort, ChatSpeed, LocalModel } from '@/lib/contracts';
import { cn } from '@/lib/utils';

interface ChatModeMenuProps {
  selectedModel: string;
  effort: ChatEffort;
  speed: ChatSpeed;
  disabled?: boolean;
  onChange: (patch: Partial<AppSettings>) => Promise<void>;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  opensUpward: boolean;
}

const EFFORT_OPTIONS: Array<{
  value: ChatEffort;
  label: string;
  icon: typeof MinusIcon;
}> = [
  { value: 'low', label: 'Baixo', icon: ArrowDownIcon },
  { value: 'medium', label: 'Médio', icon: MinusIcon },
  { value: 'high', label: 'Alto', icon: ArrowUpIcon },
];

const SPEED_OPTIONS: Array<{ value: ChatSpeed; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Rápida' },
];

function effortLabel(value: ChatEffort): string {
  return EFFORT_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function speedLabel(value: ChatSpeed): string {
  return SPEED_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function modelLabel(value: string): string {
  return value === 'auto' ? 'Automático' : value.replace(/:latest$/, '');
}

export function ChatModeMenu({
  selectedModel,
  effort,
  speed,
  disabled = false,
  onChange,
}: ChatModeMenuProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<'model' | 'effort' | 'speed' | null>(null);
  const [models, setModels] = useState<LocalModel[]>([]);
  const [modelsState, setModelsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
        setExpanded(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setExpanded(null);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || modelsState !== 'idle') return;
    setModelsState('loading');
    void window.asyncDesktop.ai
      .models()
      .then((availableModels) => {
        setModels(availableModels);
        setModelsState('ready');
      })
      .catch(() => setModelsState('error'));
  }, [modelsState, open]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const viewportPadding = 12;
    const gap = 8;
    const maxMenuHeight = 430;
    const triggerRect = trigger.getBoundingClientRect();
    const availableAbove = Math.max(triggerRect.top - gap - viewportPadding, 0);
    const availableBelow = Math.max(
      window.innerHeight - triggerRect.bottom - gap - viewportPadding,
      0
    );
    const measuredHeight = Math.min(menu.scrollHeight, maxMenuHeight);
    const opensUpward = availableAbove >= measuredHeight || availableAbove > availableBelow;
    const maxHeight = Math.max(
      120,
      Math.min(maxMenuHeight, opensUpward ? availableAbove : availableBelow)
    );
    const renderedHeight = Math.min(menu.scrollHeight, maxHeight);
    const width = Math.min(340, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.right - width, viewportPadding),
      window.innerWidth - viewportPadding - width
    );
    const top = opensUpward
      ? Math.max(viewportPadding, triggerRect.top - gap - renderedHeight)
      : Math.min(triggerRect.bottom + gap, window.innerHeight - viewportPadding);

    setPosition({ top, left, width, maxHeight, opensUpward });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const animationFrame = window.requestAnimationFrame(updatePosition);
    const observer = new ResizeObserver(updatePosition);
    if (triggerRef.current) observer.observe(triggerRef.current);
    if (menuRef.current) observer.observe(menuRef.current);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  function saveAndClose(patch: Partial<AppSettings>) {
    void onChange(patch);
    setExpanded(null);
    setOpen(false);
  }

  const optionClass = (active: boolean) =>
    cn(
      'flex w-full items-center gap-2.5 rounded-lg py-2 pl-9 pr-3 text-left text-xs transition',
      active
        ? 'bg-[var(--surface-raised)] text-[var(--text)]'
        : 'text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
    );

  const rowClass =
    'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition hover:bg-[var(--surface-raised)]';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Modelo, esforço e velocidade"
        title={`Modelo: ${modelLabel(selectedModel)} · Esforço: ${effortLabel(effort)}`}
        className={cn(
          'flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs transition disabled:opacity-40',
          open
            ? 'bg-[var(--surface-raised)] text-[var(--text)]'
            : 'text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
        )}
      >
        {speed === 'fast' && <SparkleIcon className="size-3.5" weight="fill" />}
        <span className="font-semibold text-[var(--text)]">ASYNC</span>
        <span className="hidden text-[var(--muted)] sm:inline">{effortLabel(effort)}</span>
        <CaretDownIcon className={cn('size-3 transition-transform', open && 'rotate-180')} />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menuRef}
                role="menu"
                aria-label="Modelo, esforço e velocidade"
                initial={
                  reducedMotion
                    ? false
                    : { opacity: 0, y: position?.opensUpward ? 5 : -5, scale: 0.985 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reducedMotion
                    ? undefined
                    : { opacity: 0, y: position?.opensUpward ? 5 : -5, scale: 0.985 }
                }
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={
                  position
                    ? {
                        top: position.top,
                        left: position.left,
                        width: position.width,
                        maxHeight: position.maxHeight,
                      }
                    : { visibility: 'hidden' }
                }
                className="fixed z-[100] overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-2 shadow-[0_20px_65px_rgba(0,0,0,0.42)]"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === 'model' ? null : 'model')}
                  aria-expanded={expanded === 'model'}
                  className={rowClass}
                >
                  <span>Modelo</span>
                  <span className="ml-auto max-w-[150px] truncate text-[var(--muted)]">
                    {modelLabel(selectedModel)}
                  </span>
                  <CaretRightIcon
                    className={cn(
                      'size-3.5 text-[var(--faint)] transition-transform',
                      expanded === 'model' && 'rotate-90'
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {expanded === 'model' && (
                    <motion.div
                      initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0.5 pb-1.5">
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={selectedModel === 'auto'}
                          onClick={() => saveAndClose({ selectedModel: 'auto' })}
                          className={optionClass(selectedModel === 'auto')}
                        >
                          <SparkleIcon className="size-3.5 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">Automático</span>
                            <span className="block truncate text-[10px] text-[var(--faint)]">
                              Melhor opção padrão do ASYNC
                            </span>
                          </span>
                          {selectedModel === 'auto' && <CheckIcon className="size-3.5 shrink-0" />}
                        </button>
                        {models.map((model) => (
                          <button
                            key={model.name}
                            type="button"
                            role="menuitemradio"
                            aria-checked={selectedModel === model.name}
                            onClick={() => saveAndClose({ selectedModel: model.name })}
                            className={optionClass(selectedModel === model.name)}
                          >
                            <GaugeIcon className="size-3.5 shrink-0" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">{modelLabel(model.name)}</span>
                              <span className="block truncate text-[10px] text-[var(--faint)]">
                                {[model.parameterSize, model.quantizationLevel]
                                  .filter(Boolean)
                                  .join(' · ') ||
                                  (model.isDefault ? 'Modelo padrão' : 'Modelo local')}
                              </span>
                            </span>
                            {selectedModel === model.name && (
                              <CheckIcon className="size-3.5 shrink-0" />
                            )}
                          </button>
                        ))}
                        {modelsState === 'loading' && (
                          <div className="flex items-center gap-2 px-9 py-2 text-[11px] text-[var(--faint)]">
                            <SpinnerGapIcon className="size-3.5 animate-spin" /> Verificando modelos
                            locais
                          </div>
                        )}
                        {modelsState === 'error' && (
                          <div className="flex items-center gap-2 px-9 py-2 text-[11px] text-[var(--faint)]">
                            <WarningCircleIcon className="size-3.5" /> Runtime local indisponível
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => setExpanded(expanded === 'effort' ? null : 'effort')}
                  aria-expanded={expanded === 'effort'}
                  className={rowClass}
                >
                  <span>Esforço</span>
                  <span className="ml-auto text-[var(--muted)]">{effortLabel(effort)}</span>
                  <CaretRightIcon
                    className={cn(
                      'size-3.5 text-[var(--faint)] transition-transform',
                      expanded === 'effort' && 'rotate-90'
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {expanded === 'effort' && (
                    <motion.div
                      initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0.5 pb-1.5">
                        {EFFORT_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const active = effort === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="menuitemradio"
                              aria-checked={active}
                              onClick={() => saveAndClose({ chatEffort: option.value })}
                              className={optionClass(active)}
                            >
                              <Icon className="size-3.5" />
                              <span className="flex-1">{option.label}</span>
                              {active && <CheckIcon className="size-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => setExpanded(expanded === 'speed' ? null : 'speed')}
                  aria-expanded={expanded === 'speed'}
                  className={rowClass}
                >
                  <span>Velocidade</span>
                  <span className="ml-auto text-[var(--muted)]">{speedLabel(speed)}</span>
                  <CaretRightIcon
                    className={cn(
                      'size-3.5 text-[var(--faint)] transition-transform',
                      expanded === 'speed' && 'rotate-90'
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {expanded === 'speed' && (
                    <motion.div
                      initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0.5 pb-1.5">
                        {SPEED_OPTIONS.map((option) => {
                          const active = speed === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="menuitemradio"
                              aria-checked={active}
                              onClick={() => saveAndClose({ chatSpeed: option.value })}
                              className={optionClass(active)}
                            >
                              {option.value === 'fast' ? (
                                <SparkleIcon className="size-3.5" weight="fill" />
                              ) : (
                                <GaugeIcon className="size-3.5" />
                              )}
                              <span className="flex-1">{option.label}</span>
                              {active && <CheckIcon className="size-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="my-1.5 h-px bg-[var(--border)]" />
                <button
                  type="button"
                  onClick={() =>
                    saveAndClose({
                      selectedModel: 'auto',
                      chatEffort: 'medium',
                      chatSpeed: 'normal',
                    })
                  }
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-[var(--muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                >
                  <span className="flex-1">Redefinir para o padrão</span>
                  <ArrowCounterClockwiseIcon className="size-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
