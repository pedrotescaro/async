import {
  ArrowUpIcon,
  CheckIcon,
  CodeIcon,
  PaperclipIcon,
  SparkleIcon,
} from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Brand } from './brand';

const PROMPT = 'Can you explain why this React effect keeps running?';
const RESPONSE =
  'The effect runs after every render because the dependency array is missing. React sees no boundary for when the effect should re-run.\n\nAdd [query] when the effect only depends on query — but first check whether the effect updates query itself, which could create a loop.';

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function HeroDemo() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [attached, setAttached] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [complete, setComplete] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setPrompt(PROMPT);
      setAttached(true);
      setResponse(RESPONSE);
      setComplete(true);
      return;
    }

    let cancelled = false;
    async function runLoop() {
      while (!cancelled) {
        setPrompt('');
        setResponse('');
        setAttached(false);
        setAnswering(false);
        setComplete(false);
        await delay(500);
        for (let index = 1; index <= PROMPT.length && !cancelled; index += 1) {
          setPrompt(PROMPT.slice(0, index));
          await delay(34);
        }
        await delay(420);
        if (cancelled) return;
        setAttached(true);
        await delay(650);
        if (cancelled) return;
        setAnswering(true);
        for (let index = 1; index <= RESPONSE.length && !cancelled; index += 1) {
          setResponse(RESPONSE.slice(0, index));
          await delay(13);
        }
        setAnswering(false);
        setComplete(true);
        await delay(3600);
      }
    }
    void runLoop();
    return () => {
      cancelled = true;
    };
  }, [reducedMotion]);

  return (
    <motion.div
      className="hero-demo"
      initial={reducedMotion ? false : { opacity: 0, y: 18, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay: 0.25, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Interactive ASYNC product demonstration"
    >
      <div className="demo-toolbar">
        <Brand />
        <div className="demo-status">
          <span /> Local on this device
        </div>
        <div className="demo-actions">
          <button type="button">+ New chat</button>
          <button type="button">History</button>
        </div>
      </div>
      <div className="demo-body">
        <div className="demo-grid" aria-hidden="true" />
        <div className="demo-conversation">
          <div className="demo-question">
            <p>
              {prompt}
              <span className="typing-caret" />
            </p>
            <AnimatePresence>
              {attached && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="demo-attachment"
                >
                  <CodeIcon />
                  <span>EffectExample.tsx</span>
                  <CheckIcon />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="demo-response">
            <div className="demo-response-brand">
              <Brand compact />
              <strong>ASYNC</strong>
              {answering && <span>is explaining</span>}
            </div>
            <p>
              {response}
              {answering && <span className="stream-caret" />}
            </p>
            <AnimatePresence>
              {complete && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="demo-followups"
                >
                  <button type="button">Explain simpler</button>
                  <button type="button">Show example</button>
                  <button type="button">Quiz me</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="demo-composer">
        <span>Ask, paste, or write anything...</span>
        <div>
          <PaperclipIcon />
          <small>Powered by ASYNC</small>
        </div>
        <button type="button" aria-label="Send">
          <ArrowUpIcon />
        </button>
      </div>
      <div className="demo-glow">
        <SparkleIcon />
      </div>
    </motion.div>
  );
}
