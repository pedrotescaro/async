import { app, Menu } from 'electron';
import { registerIpcHandlers } from '../ipc/register-handlers';
import { LocalAsyncEngine } from '../services/ai/async-engine';
import { captureSelection } from '../services/selection/capture';
import { ShortcutManager } from '../services/shortcuts/manager';
import { HistoryStore } from '../services/storage/history-store';
import { NotesStore } from '../services/storage/notes-store';
import { SettingsStore } from '../services/storage/settings-store';
import { initializeUpdater } from '../services/updater/manager';
import { APP_NAME, DEFAULT_SHORTCUT } from './constants';
import { createAppTray } from './tray-manager';
import { createMainWindow, markAppQuitting, showMainWindow } from './window-manager';

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal');
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

const shortcutManager = new ShortcutManager();

app.whenReady().then(async () => {
  app.setName(APP_NAME);
  if (process.platform === 'win32') app.setAppUserModelId('dev.async.desktop');
  Menu.setApplicationMenu(null);

  const settingsStore = new SettingsStore();
  const settings = await settingsStore.get();
  const window = createMainWindow();
  const showWithClipboard = () => showMainWindow(captureSelection());

  const registerShortcut = (accelerator: string) => {
    const registered = shortcutManager.register(accelerator, showWithClipboard);
    if (!registered && accelerator !== DEFAULT_SHORTCUT) {
      shortcutManager.register(DEFAULT_SHORTCUT, showWithClipboard);
    }
  };

  registerIpcHandlers({
    window,
    engine: new LocalAsyncEngine(),
    notes: new NotesStore(),
    history: new HistoryStore(),
    settings: settingsStore,
    onSettingsChanged: (next) => {
      registerShortcut(next.globalShortcut);
      app.setLoginItemSettings({ openAtLogin: next.launchAtStartup });
    },
  });

  createAppTray();
  registerShortcut(settings.globalShortcut);
  app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup });
  initializeUpdater();

  window.once('ready-to-show', () => showMainWindow());
  setTimeout(() => {
    if (!window.isDestroyed() && !window.isVisible()) {
      showMainWindow();
    }
  }, 1200);
});

app.on('second-instance', () => showMainWindow());
app.on('activate', () => showMainWindow());
app.on('before-quit', () => markAppQuitting());
app.on('will-quit', () => shortcutManager.unregisterAll());
app.on('window-all-closed', () => {
  // ASYNC stays available from the tray and global shortcut.
});
