import { ArrowRightIcon, DownloadSimpleIcon, GithubLogoIcon } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { Brand } from './components/brand';
import { HeroDemo } from './components/hero-demo';
import { Particles } from './components/particles';

const GITHUB_URL = 'https://github.com/pedrotescaro/async';
const RELEASES_URL = `${GITHUB_URL}/releases`;
const DOCS_URL = `${GITHUB_URL}/tree/main/docs`;
const HERO_PARTICLE_COLORS = ['#ffffff', '#b8b8b8', '#6f6f6f'];

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
