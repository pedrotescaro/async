import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export const APP_ROOT = path.join(currentDirectory, '..');
export const RENDERER_DIST = path.join(APP_ROOT, 'dist');
export const INDEX_HTML = path.join(RENDERER_DIST, 'index.html');
export const PRELOAD_PATH = path.join(currentDirectory, 'index.mjs');
export const APP_ICON = path.join(APP_ROOT, 'assets', 'app', 'icon.png');
export const TRAY_ICON = path.join(APP_ROOT, 'assets', 'tray', 'tray-icon.png');
export const MODELFILE_PATH = path.join(APP_ROOT, 'ai', 'Modelfile');
export const PROMPTS_PATH = path.join(APP_ROOT, 'ai', 'prompts');
export const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
export const DEFAULT_SHORTCUT = 'Control+Alt+A';
export const APP_NAME = 'ASYNC';
export const GITHUB_URL = 'https://github.com/pedrotescaro/async';
export const RELEASES_URL = `${GITHUB_URL}/releases`;
