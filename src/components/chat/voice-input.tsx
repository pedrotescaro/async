import { MicrophoneIcon, SquareIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { SpeechLanguage } from '@/lib/contracts';
import { cn } from '@/lib/utils';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  readonly error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface VoiceInputProps {
  language: SpeechLanguage;
  disabled?: boolean;
  onTranscript: (text: string) => void;
}

const SUPPORTED_LANGUAGES: Exclude<SpeechLanguage, 'auto'>[] = [
  'pt-BR',
  'en-US',
  'es-ES',
  'fr-FR',
  'de-DE',
  'it-IT',
];

const SILENCE_TIMEOUT_MS = 2_800;
const WAVE_BARS = [
  { id: 'one', height: 8 },
  { id: 'two', height: 14 },
  { id: 'three', height: 10 },
  { id: 'four', height: 16 },
  { id: 'five', height: 7 },
  { id: 'six', height: 12 },
  { id: 'seven', height: 9 },
];

function recognitionConstructor(): SpeechRecognitionConstructor | null {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function resolveLanguage(language: SpeechLanguage): string {
  if (language !== 'auto') return language;
  const preferred = navigator.languages.length ? navigator.languages : [navigator.language];
  for (const candidate of preferred) {
    const exact = SUPPORTED_LANGUAGES.find(
      (supported) => supported.toLowerCase() === candidate.toLowerCase()
    );
    if (exact) return exact;
    const sameLanguage = SUPPORTED_LANGUAGES.find(
      (supported) => supported.split('-')[0] === candidate.split('-')[0]
    );
    if (sameLanguage) return sameLanguage;
  }
  return 'pt-BR';
}

function formatTime(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function VoiceInput({ language, disabled = false, onTranscript }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTextRef = useRef('');
  const lastResultAtRef = useRef(0);
  const watchdogRef = useRef<number | null>(null);
  const noticeRef = useRef<number | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    if (!listening) return;
    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [listening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (watchdogRef.current !== null) window.clearInterval(watchdogRef.current);
      if (noticeRef.current !== null) window.clearTimeout(noticeRef.current);
    };
  }, []);

  function clearRecognition() {
    if (watchdogRef.current !== null) {
      window.clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
    recognitionRef.current = null;
    setListening(false);
    setSeconds(0);
    setInterim('');
  }

  function showError(message: string) {
    setError(message);
    if (noticeRef.current !== null) window.clearTimeout(noticeRef.current);
    noticeRef.current = window.setTimeout(() => setError(null), 4_200);
  }

  async function startRecognition() {
    const Recognition = recognitionConstructor();
    if (!Recognition) {
      showError('A transcrição de voz não está disponível nesta versão do sistema.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) track.stop();
    } catch {
      showError('Permita o acesso ao microfone para usar a entrada de voz.');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = resolveLanguage(language);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    finalTextRef.current = '';

    recognition.onresult = (event) => {
      lastResultAtRef.current = Date.now();
      let finalText = finalTextRef.current;
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) finalText += text;
        else interimText += text;
      }
      finalTextRef.current = finalText;
      setInterim(`${finalText}${interimText}`.trim());
    };

    recognition.onerror = (event) => {
      const permissionDenied =
        event.error === 'not-allowed' || event.error === 'service-not-allowed';
      clearRecognition();
      if (permissionDenied) showError('O acesso ao microfone foi bloqueado pelo sistema.');
      else if (!['aborted', 'no-speech'].includes(event.error)) {
        showError('Não foi possível reconhecer o áudio. Tente novamente.');
      }
    };

    recognition.onend = () => {
      const transcript = finalTextRef.current.trim();
      clearRecognition();
      finalTextRef.current = '';
      if (transcript) onTranscriptRef.current(transcript);
    };

    recognitionRef.current = recognition;
    lastResultAtRef.current = Date.now();
    setError(null);
    setSeconds(0);
    setInterim('');
    setListening(true);

    try {
      recognition.start();
      watchdogRef.current = window.setInterval(() => {
        if (Date.now() - lastResultAtRef.current > SILENCE_TIMEOUT_MS) {
          recognitionRef.current?.stop();
        }
      }, 500);
    } catch {
      clearRecognition();
      showError('Não foi possível iniciar o reconhecimento de voz.');
    }
  }

  function toggleListening() {
    if (disabled) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    void startRecognition();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        aria-label={listening ? 'Parar entrada de voz' : 'Usar entrada de voz'}
        aria-pressed={listening}
        title={listening ? 'Parar gravação' : `Entrada de voz · ${resolveLanguage(language)}`}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)] disabled:opacity-40',
          listening && 'bg-[var(--surface-raised)] text-[var(--text)]'
        )}
      >
        {listening ? (
          <SquareIcon className="size-3.5" weight="fill" />
        ) : (
          <MicrophoneIcon className="size-[17px]" />
        )}
      </button>

      <AnimatePresence>
        {listening && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 5, scale: 0.98 }}
            className="absolute bottom-12 right-0 z-40 w-[min(320px,calc(100vw-3rem))] rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-3 shadow-[0_18px_55px_rgba(0,0,0,0.38)]"
          >
            <div className="flex items-center gap-2 text-xs">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute size-2 animate-ping rounded-full bg-[var(--text)] opacity-45" />
                <span className="relative size-2 rounded-full bg-[var(--text)]" />
              </span>
              <span className="font-semibold">Ouvindo</span>
              <span className="font-mono tabular-nums text-[var(--faint)]">
                {formatTime(seconds)}
              </span>
              <div className="ml-auto flex h-4 items-center gap-[3px]" aria-hidden="true">
                {WAVE_BARS.map((bar, index) => (
                  <motion.span
                    key={bar.id}
                    animate={reducedMotion ? undefined : { height: [4, bar.height, 4] }}
                    transition={{ duration: 0.8 + index * 0.05, repeat: Number.POSITIVE_INFINITY }}
                    className="w-[2px] rounded-full bg-[var(--muted)]"
                  />
                ))}
              </div>
            </div>
            <p className="mt-2 min-h-5 truncate text-[11px] text-[var(--muted)]">
              {interim || `Fale em ${resolveLanguage(language)}…`}
            </p>
          </motion.div>
        )}
        {error && !listening && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-12 right-0 z-40 flex w-[min(320px,calc(100vw-3rem))] items-start gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-3 text-[11px] leading-5 text-[var(--muted)] shadow-xl"
          >
            <WarningCircleIcon className="mt-0.5 size-4 shrink-0 text-[var(--text)]" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
