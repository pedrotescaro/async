import { app, Notification } from 'electron';
import updaterPackage from 'electron-updater';

const { autoUpdater } = updaterPackage;
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

function canUpdate(): boolean {
  if (!app.isPackaged) return false;
  if (process.platform === 'linux' && !process.env.APPIMAGE) return false;
  return true;
}

export function initializeUpdater(): void {
  if (!canUpdate()) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('error', (error) => console.error('[updater]', error));
  autoUpdater.on('update-downloaded', () => {
    if (!Notification.isSupported()) return;
    new Notification({
      title: 'ASYNC update ready',
      body: 'The update will be installed when ASYNC closes.',
    }).show();
  });
  setTimeout(() => void autoUpdater.checkForUpdates(), 8_000);
  setInterval(() => void autoUpdater.checkForUpdates(), FOUR_HOURS_MS);
}
