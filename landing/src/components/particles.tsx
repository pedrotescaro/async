import { useReducedMotion } from 'motion/react';
import { Camera, Geometry, Mesh, Program, Renderer } from 'ogl';
import { useEffect, useRef } from 'react';
import './particles.css';

interface ParticlesProps {
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleColors?: string[];
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  alphaParticles?: boolean;
  particleBaseSize?: number;
  sizeRandomness?: number;
  cameraDistance?: number;
  disableRotation?: boolean;
  pixelRatio?: number;
  className?: string;
}

const DEFAULT_COLORS = ['#ffffff', '#b8b8b8', '#6f6f6f'];

const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;

  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vRandom = random;
    vColor = color;

    vec3 pos = position * uSpread;
    pos.z *= 10.0;

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    modelPosition.x += sin(uTime * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    modelPosition.y += sin(uTime * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    modelPosition.z += sin(uTime * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);

    vec4 viewPosition = viewMatrix * modelPosition;
    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize =
        (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) /
        length(viewPosition.xyz);
    }

    gl_Position = projectionMatrix * viewPosition;
  }
`;

const fragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord.xy;
    float distanceFromCenter = length(uv - vec2(0.5));
    float shimmer = 0.08 * sin(uv.y + uTime + vRandom.y * 6.28);
    vec3 monochromeColor = clamp(vColor + vec3(shimmer), 0.0, 1.0);

    if (uAlphaParticles < 0.5) {
      if (distanceFromCenter > 0.5) {
        discard;
      }
      gl_FragColor = vec4(monochromeColor, 1.0);
    } else {
      float circle = smoothstep(0.5, 0.34, distanceFromCenter) * 0.72;
      gl_FragColor = vec4(monochromeColor, circle);
    }
  }
`;

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace(/^#/, '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => character + character)
          .join('')
      : normalized;
  const value = Number.parseInt(expanded.slice(0, 6), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

// Adapted from the open-source React Bits Particles component for ASYNC's monochrome hero.
export function Particles({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors = DEFAULT_COLORS,
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  pixelRatio = 1,
  className = '',
}: ParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof WebGLRenderingContext === 'undefined') return;

    const renderer = new Renderer({
      dpr: clamp(pixelRatio, 1, 2),
      depth: false,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);

    const camera = new Camera(gl, { fov: 15 });
    camera.position.set(0, 0, cameraDistance);

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height);
      camera.perspective({ aspect: width / height });
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const isInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (!isInside) {
        pointerRef.current = { x: 0, y: 0 };
        return;
      }

      pointerRef.current = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -(((event.clientY - rect.top) / rect.height) * 2 - 1),
      };
    };

    window.addEventListener('resize', resize, { passive: true });
    if (moveParticlesOnHover) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
    }
    resize();

    const positions = new Float32Array(particleCount * 3);
    const randoms = new Float32Array(particleCount * 4);
    const colors = new Float32Array(particleCount * 3);
    const palette = particleColors.length > 0 ? particleColors : DEFAULT_COLORS;

    for (let index = 0; index < particleCount; index += 1) {
      let x = 0;
      let y = 0;
      let z = 0;
      let length = 0;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        length = x * x + y * y + z * z;
      } while (length > 1 || length === 0);

      const radius = Math.cbrt(Math.random());
      positions.set([x * radius, y * radius, z * radius], index * 3);
      randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], index * 4);
      const color = hexToRgb(palette[Math.floor(Math.random() * palette.length)]);
      colors.set(color, index * 3);
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colors },
    });
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: particleSpread },
        uBaseSize: { value: particleBaseSize * clamp(pixelRatio, 1, 2) },
        uSizeRandomness: { value: sizeRandomness },
        uAlphaParticles: { value: alphaParticles ? 1 : 0 },
      },
      transparent: true,
      depthTest: false,
    });
    const particles = new Mesh(gl, { mode: gl.POINTS, geometry, program });

    let animationFrameId: number | undefined;
    let lastTime = performance.now();
    let elapsed = 0;

    const renderFrame = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      elapsed += delta * speed;
      program.uniforms.uTime.value = elapsed * 0.001;

      particles.position.x = moveParticlesOnHover ? -pointerRef.current.x * particleHoverFactor : 0;
      particles.position.y = moveParticlesOnHover ? -pointerRef.current.y * particleHoverFactor : 0;

      if (!disableRotation) {
        particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1;
        particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15;
        particles.rotation.z += 0.01 * speed;
      }

      renderer.render({ scene: particles, camera });
      if (!reducedMotion) {
        animationFrameId = window.requestAnimationFrame(renderFrame);
      }
    };

    if (reducedMotion) {
      renderFrame(lastTime);
    } else {
      animationFrameId = window.requestAnimationFrame(renderFrame);
    }

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      if (animationFrameId !== undefined) {
        window.cancelAnimationFrame(animationFrameId);
      }
      geometry.remove();
      program.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      gl.canvas.remove();
    };
  }, [
    alphaParticles,
    cameraDistance,
    disableRotation,
    moveParticlesOnHover,
    particleBaseSize,
    particleColors,
    particleCount,
    particleHoverFactor,
    particleSpread,
    pixelRatio,
    reducedMotion,
    sizeRandomness,
    speed,
  ]);

  return <div ref={containerRef} className={`particles-container ${className}`.trim()} />;
}
