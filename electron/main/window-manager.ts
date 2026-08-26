import { BrowserWindow, shell } from 'electron';
import type { SelectionPayload } from '../../src/lib/contracts';
import { IPC_CHANNELS } from '../ipc/channels';
import { APP_ICON, DEV_SERVER_URL, INDEX_HTML, PRELOAD_PATH } from './constants';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

async function loadRenderer(window: BrowserWindow): Promise<void> {
  if (DEV_SERVER_URL) {
    await window.loadURL(DEV_SERVER_URL);
    return;
  }
  await window.loadFile(INDEX_HTML);
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 820,
    minHeight: 560,
    show: false,
    frame: false,
    title: 'ASYNC',
    icon: APP_ICON,
    backgroundColor: '#050505',
    roundedCorners: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  void loadRenderer(mainWindow);
  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`ASYNC preload failed at ${preloadPath}:`, error);
  });
  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    console.error(`ASYNC renderer failed to load (${code}): ${description}`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('ASYNC renderer exited unexpectedly:', details.reason);
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDevNavigation = Boolean(DEV_SERVER_URL && url.startsWith(DEV_SERVER_URL));
    const isPackagedNavigation = url.startsWith('file:');
    if (isDevNavigation || isPackagedNavigation) return;
    event.preventDefault();
  });
  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
  });
  return mainWindow;
}

export function showMainWindow(selection?: SelectionPayload | null): void {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
  if (!selection) return;
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send(IPC_CHANNELS.selectionCaptured, selection);
    });
    return;
  }
  mainWindow.webContents.send(IPC_CHANNELS.selectionCaptured, selection);
}

export function hideMainWindow(): void {
  mainWindow?.hide();
}

export function markAppQuitting(): void {
  isQuitting = true;
}
