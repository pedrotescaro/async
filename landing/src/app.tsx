import {
  ArrowRightIcon,
  BookOpenTextIcon,
  BracketsCurlyIcon,
  BugIcon,
  CheckIcon,
  ClockIcon,
  DownloadSimpleIcon,
  GithubLogoIcon,
  GlobeIcon,
  KeyboardIcon,
  MagicWandIcon,
  NotePencilIcon,
  StarIcon,
  TranslateIcon,
} from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { Brand } from './components/brand';
import { HeroDemo } from './components/hero-demo';
import { Particles } from './components/particles';

const GITHUB_URL = 'https://github.com/pedrotescaro/async';
const RELEASES_URL = `${GITHUB_URL}/releases`;
const DOCS_URL = `${GITHUB_URL}/tree/main/docs`;
const HERO_PARTICLE_COLORS = ['#ffffff', '#b8b8b8', '#6f6f6f'];

const CAPABILITIES = [
  {
    title: 'Explain',
    copy: 'Turn unfamiliar ideas into concepts you can use.',
    icon: BookOpenTextIcon,
  },
  { title: 'Learn', copy: 'Get hints, examples, questions, and study notes.', icon: StarIcon },
  { title: 'Rewrite', copy: 'Improve clarity without losing your own voice.', icon: MagicWandIcon },
  { title: 'Debug', copy: 'Understand errors before changing the code.', icon: BugIcon },
  {
    title: 'Review',
    copy: 'Inspect correctness, trade-offs, and maintainability.',
    icon: BracketsCurlyIcon,
  },
  { title: 'Translate', copy: 'Preserve technical meaning across languages.', icon: TranslateIcon },
];

export function LandingApp() {
  const reducedMotion = useReducedMotion();
  const reveal = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.25 },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div className="site-shell">
      <header className="site-header">
        <a href="#top" aria-label="ASYNC home">
          <Brand />
        </a>
        <nav aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#features">Features</a>
          <a href="#open-source">Open Source</a>
          <a href={DOCS_URL}>Docs</a>
        </nav>
        <div className="header-actions">
          <a href={GITHUB_URL}>
            <GithubLogoIcon /> GitHub
          </a>
          <a className="header-download" href={RELEASES_URL}>
            <DownloadSimpleIcon /> Download
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero-section" id="product">
          <Particles
            className="hero-particles"
            particleColors={HERO_PARTICLE_COLORS}
            particleCount={180}
            particleSpread={12}
            speed={0.055}
            particleBaseSize={72}
            sizeRandomness={0.9}
            moveParticlesOnHover
            particleHoverFactor={0.42}
            alphaParticles
            cameraDistance={20}
            pixelRatio={1.5}
          />
          <div className="hero-noise" aria-hidden="true" />
          <motion.div
            className="hero-copy"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
          >
            <div className="hero-badge">
              <span /> Open source · Local-first · Built for learning
            </div>
            <h1>
              Your AI for
              <br /> learning and building.
            </h1>
            <p>
              An open-source desktop writing assistant for students and developers who want to
              understand more, write better, and build with confidence.
            </p>
            <div className="hero-ctas">
              <a className="button-primary" href={RELEASES_URL}>
                <DownloadSimpleIcon /> Download ASYNC
              </a>
              <a className="button-secondary" href={GITHUB_URL}>
                <GithubLogoIcon /> View on GitHub
              </a>
            </div>
            <small>Windows & Linux · No account required</small>
          </motion.div>
          <HeroDemo />
        </section>

        <section className="shortcut-section section" aria-labelledby="everywhere-title">
          <motion.div {...reveal} className="shortcut-copy">
            <p className="eyebrow">Your AI, everywhere</p>
            <h2 id="everywhere-title">Stay in your flow.</h2>
            <p>
              Select what you are working on, press one shortcut, and ASYNC is ready with actions
              that fit the context.
            </p>
          </motion.div>
          <motion.div {...reveal} className="shortcut-card">
            <div className="shortcut-keys">
              <kbd>Ctrl</kbd>
              <span>+</span>
              <kbd>Alt</kbd>
              <span>+</span>
              <kbd>A</kbd>
            </div>
            <div className="shortcut-flow">
              <span>Selected text</span>
              <ArrowRightIcon />
              <span>Context detected</span>
              <ArrowRightIcon />
              <strong>Ask ASYNC</strong>
            </div>
          </motion.div>
        </section>

        <section
          className="section capability-section"
          id="features"
          aria-labelledby="capabilities-title"
        >
          <motion.div {...reveal} className="section-heading">
            <p className="eyebrow">More than autocomplete</p>
            <h2 id="capabilities-title">
              Answers are useful.
              <br />
              Understanding is better.
            </h2>
            <p>
              ASYNC helps you reason about the work, then gives you the answer when it is
              appropriate.
            </p>
          </motion.div>
          <div className="capability-grid">
            {CAPABILITIES.map((capability, index) => {
              const Icon = capability.icon;
              return (
                <motion.article
                  key={capability.title}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: index * 0.04 }}
                >
                  <Icon />
                  <h3>{capability.title}</h3>
                  <p>{capability.copy}</p>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section
          className="section split-section developer-section"
          aria-labelledby="developer-title"
        >
          <motion.div {...reveal} className="split-copy">
            <p className="eyebrow">Built for developers</p>
            <h2 id="developer-title">
              Debug the idea,
              <br />
              not just the line.
            </h2>
            <p>
              Paste code, an error, a stack trace, README, or diff. ASYNC separates observations
              from guesses and shows you how to verify the cause.
            </p>
            <ul>
              <li>
                <CheckIcon /> Explain code and errors
              </li>
              <li>
                <CheckIcon /> Review architecture and trade-offs
              </li>
              <li>
                <CheckIcon /> Generate focused documentation
              </li>
            </ul>
          </motion.div>
          <motion.div {...reveal} className="code-card">
            <div className="code-card-head">
              <span>EffectExample.tsx</span>
              <span>Reviewing</span>
            </div>
            <pre>
              <code>
                <span>useEffect</span>
                {`() => {\n  fetchResults(query).then(setResults);\n});`}
              </code>
            </pre>
            <div className="review-note">
              <Brand compact />
              <p>
                <strong>The missing dependency array is the first issue.</strong>
                <br />
                Before adding it, check whether the effect changes <code>query</code> indirectly.
              </p>
            </div>
          </motion.div>
        </section>

        <section className="section split-section student-section" aria-labelledby="student-title">
          <motion.div {...reveal} className="study-card">
            <div className="study-card-head">
              <NotePencilIcon />
              <span>Study notes · HTTP</span>
            </div>
            <div className="study-item">
              <small>01</small>
              <p>
                <strong>Request and response</strong>
                <br />A client asks; a server answers with status, headers, and a body.
              </p>
            </div>
            <div className="study-item">
              <small>02</small>
              <p>
                <strong>Stateless by default</strong>
                <br />
                Each request contains the context the server needs.
              </p>
            </div>
            <div className="study-actions">
              <button type="button">Create flashcards</button>
              <button type="button">Quiz me</button>
            </div>
          </motion.div>
          <motion.div {...reveal} className="split-copy">
            <p className="eyebrow">Built for students</p>
            <h2 id="student-title">
              Turn information
              <br />
              into something you know.
            </h2>
            <p>
              Move from explanation to examples, study notes, flashcards, and questions without
              leaving your desktop.
            </p>
            <ul>
              <li>
                <CheckIcon /> Explanations adapted to your level
              </li>
              <li>
                <CheckIcon /> Summaries and study notes
              </li>
              <li>
                <CheckIcon /> Hints before complete solutions
              </li>
            </ul>
          </motion.div>
        </section>

        <section className="section quiet-section" aria-labelledby="quiet-title">
          <motion.div {...reveal} className="section-heading centered">
            <p className="eyebrow">Stays out of your way</p>
            <h2 id="quiet-title">
              There when you need it.
              <br />
              Gone when you do not.
            </h2>
          </motion.div>
          <div className="quiet-grid">
            <motion.article {...reveal}>
              <KeyboardIcon />
              <h3>Global shortcut</h3>
              <p>Open ASYNC without switching context.</p>
              <kbd>Ctrl + Alt + A</kbd>
            </motion.article>
            <motion.article {...reveal}>
              <ClockIcon />
              <h3>Instant opening</h3>
              <p>A compact desktop shell ready from the tray.</p>
              <span className="pulse-line" />
            </motion.article>
            <motion.article {...reveal}>
              <GlobeIcon />
              <h3>Windows & Linux</h3>
              <p>One local-first architecture for both platforms.</p>
              <span>Desktop first</span>
            </motion.article>
          </div>
        </section>

        <section className="section local-section" aria-labelledby="local-title">
          <motion.div {...reveal} className="local-panel">
            <div>
              <p className="eyebrow">Local-first AI</p>
              <h2 id="local-title">
                No API keys.
                <br />
                No provider setup.
                <br />
                No model selector.
                <br />
                <strong>Just ASYNC.</strong>
              </h2>
            </div>
            <div className="local-copy">
              <p>
                ASYNC is designed to process requests through a local intelligence engine managed by
                the desktop app. The first release keeps setup and diagnostics explicit while the
                installer path matures.
              </p>
              <p>
                Notes, chat history, settings, and runtime state are stored as separate local data
                domains.
              </p>
            </div>
          </motion.div>
        </section>

        <section className="section open-section" id="open-source" aria-labelledby="open-title">
          <motion.div {...reveal} className="open-panel">
            <GithubLogoIcon />
            <p className="eyebrow">Open source</p>
            <h2 id="open-title">Built in public.</h2>
            <p>
              Inspect it. Fork it. Improve it.
              <br />
              Make ASYNC yours.
            </p>
            <a className="button-primary inverse" href={GITHUB_URL}>
              <StarIcon /> Star on GitHub
            </a>
          </motion.div>
        </section>
      </main>

      <footer className="site-footer">
        <Brand />
        <p>Write better. Learn faster. Build smarter.</p>
        <div>
          <a href={GITHUB_URL}>GitHub</a>
          <a href={RELEASES_URL}>Releases</a>
          <a href={DOCS_URL}>Docs</a>
        </div>
      </footer>
    </div>
  );
}
