import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.join(projectRoot, 'src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: { entry: 'electron/main/main.ts' },
      preload: { input: 'electron/preload/index.ts' },
      renderer: {},
    }),
  ],
  build: {
    sourcemap: true,
  },
});
