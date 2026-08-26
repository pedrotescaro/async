import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(projectRoot, 'landing'),
  publicDir: path.join(projectRoot, 'public'),
  resolve: {
    alias: {
      '@landing': path.join(projectRoot, 'landing/src'),
    },
  },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.join(projectRoot, 'dist-site'),
    emptyOutDir: true,
    sourcemap: true,
  },
});
