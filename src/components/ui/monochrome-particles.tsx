import { motion, useReducedMotion } from 'motion/react';

const PARTICLES = [
  [8, 18, 1],
  [17, 74, 2],
  [24, 42, 1],
  [31, 12, 1],
  [38, 86, 2],
  [45, 31, 1],
  [53, 67, 1],
  [61, 20, 2],
  [69, 80, 1],
  [76, 46, 1],
  [83, 14, 2],
  [91, 70, 1],
] as const;

export function MonochromeParticles() {
  const reducedMotion = useReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {PARTICLES.map(([left, top, size], index) => (
        <motion.span
          key={`${left}-${top}`}
          className="absolute rounded-full bg-[var(--text)] opacity-20"
          style={{ left: `${left}%`, top: `${top}%`, width: size, height: size }}
          animate={
            reducedMotion
              ? undefined
              : {
                  opacity: [0.08, 0.28, 0.08],
                  y: [0, index % 2 === 0 ? -9 : 9, 0],
                }
          }
          transition={{ duration: 6 + (index % 5), repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
