import { BrowserWindow, shell } from 'electron';
import type { DesktopWindowState, SelectionPayload } from '../../src/lib/contracts';
import { IPC_CHANNELS } from '../ipc/channels';
import { APP_ICON, DEV_SERVER_URL, INDEX_HTML, PRELOAD_PATH } from './constants';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

function windowState(window = mainWindow): DesktopWindowState {
  return {
    maximized: Boolean(window?.isMaximized()),
    fullScreen: Boolean(window?.isFullScreen()),
  };
}

function emitWindowState(window: BrowserWindow): void {
  if (window.isDestroyed()) return;
  window.webContents.send(IPC_CHANNELS.appWindowStateChanged, windowState(window));
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 820,
    minHeight: 560,
    show: false,
    center: true,
    frame: false,
    title: 'ASYNC',
    icon: APP_ICON,
    backgroundColor: '#050505',
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`ASYNC preload failed at ${preloadPath}:`, error);
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    console.error(`ASYNC renderer failed to load (${code}): ${description}`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('ASYNC renderer exited unexpectedly:', details.reason);
  });

  const trustedWebContentsId = mainWindow.webContents.id;
  mainWindow.webContents.session.setPermissionCheckHandler(
    (webContents, permission, _origin, details) => {
      if (webContents?.id !== trustedWebContentsId) return false;
      if (permission === 'clipboard-sanitized-write') return true;
      return permission === 'media' && details.mediaType === 'audio';
    }
  );
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const mediaTypes = 'mediaTypes' in details ? details.mediaTypes : undefined;
      const audioOnly =
        Boolean(mediaTypes?.length) && mediaTypes?.every((type) => type === 'audio');
      callback(
        webContents.id === trustedWebContentsId &&
          (permission === 'clipboard-sanitized-write' ||
            (permission === 'media' && audioOnly === true))
      );
    }
  );

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
  mainWindow.on('maximize', () => emitWindowState(mainWindow as BrowserWindow));
  mainWindow.on('unmaximize', () => emitWindowState(mainWindow as BrowserWindow));
  mainWindow.on('enter-full-screen', () => emitWindowState(mainWindow as BrowserWindow));
  mainWindow.on('leave-full-screen', () => emitWindowState(mainWindow as BrowserWindow));
  if (DEV_SERVER_URL) {
    void mainWindow.loadURL(DEV_SERVER_URL).catch((error) => {
      console.error('ASYNC failed to load the development server:', error);
    });
  } else {
    void mainWindow.loadFile(INDEX_HTML).catch((error) => {
      console.error('ASYNC failed to load the packaged renderer:', error);
    });
  }

  if (DEV_SERVER_URL && process.env.ASYNC_OPEN_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  return mainWindow;
}

export function showMainWindow(selection?: SelectionPayload | null): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
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

export function getWindowState(): DesktopWindowState {
  return windowState();
}

export function toggleMaximize(): DesktopWindowState {
  if (!mainWindow || mainWindow.isDestroyed()) return windowState();
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return windowState(mainWindow);
}

export function toggleFullScreen(): DesktopWindowState {
  if (!mainWindow || mainWindow.isDestroyed()) return windowState();
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
  return windowState(mainWindow);
}

export function markAppQuitting(): void {
  isQuitting = true;
}
