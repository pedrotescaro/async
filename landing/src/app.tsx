import { motion, useReducedMotion } from 'motion/react';
import { Brand } from './components/brand';
import { GitHubLogo } from './components/github-logo';
import { HeroDemo } from './components/hero-demo';
import Particles from './components/particles';

const GITHUB_URL = 'https://github.com/pedrotescaro/async';
const RELEASES_URL = `${GITHUB_URL}/releases`;
const DOCS_URL = `${GITHUB_URL}/tree/main/docs`;

function DownloadIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function LandingApp() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="site-shell">
      <header className="site-header">
        <a href="#top" aria-label="ASYNC home">
          <Brand />
        </a>
        <div className="header-actions">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="header-gh-btn"
            aria-label="GitHub repository"
          >
            <GitHubLogo size={16} />
            <span>GitHub</span>
          </a>
          <a className="header-download" href={RELEASES_URL} target="_blank" rel="noreferrer">
            <DownloadIcon size={16} />
            <span>Download</span>
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero-section" id="product">
          <div className="hero-particles-bg">
            <Particles
              particleColors={['#ffffff']}
              particleCount={200}
              particleSpread={10}
              speed={0.1}
              particleBaseSize={100}
              moveParticlesOnHover
              alphaParticles={false}
              disableRotation={false}
              pixelRatio={1}
            />
          </div>
          <div className="hero-noise" aria-hidden="true" />
          <motion.div
            className="hero-copy"
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
          >
            <h1>Write better, learn faster, build smarter.</h1>
            <p>
              An open-source desktop writing assistant for students and developers who want to
              understand more, write better, and build with confidence.
            </p>
            <div className="hero-ctas">
              <a className="button-primary" href={RELEASES_URL} target="_blank" rel="noreferrer">
                <span className="button-shimmer" aria-hidden="true" />
                <DownloadIcon size={16} />
                <span>Download for free</span>
              </a>
              <a className="button-secondary" href={GITHUB_URL} target="_blank" rel="noreferrer">
                <GitHubLogo size={16} />
                <span>View on GitHub</span>
              </a>
            </div>
            <small>Windows & Linux · No account required</small>
          </motion.div>
          <HeroDemo />
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-brand-wrap">
            <Brand />
            <p className="footer-motto">Write better, learn faster, build smarter.</p>
          </div>
          <div className="footer-links">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="footer-link">
              <GitHubLogo size={15} />
              <span>GitHub</span>
            </a>
            <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="footer-link">
              Releases
            </a>
            <a href={DOCS_URL} target="_blank" rel="noreferrer" className="footer-link">
              Docs
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} ASYNC. Free and open-source software under the MIT License.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingApp;
