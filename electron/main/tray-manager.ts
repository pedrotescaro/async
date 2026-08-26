import { app, Menu, nativeImage, Tray } from 'electron';
import { APP_NAME, TRAY_ICON } from './constants';
import { showMainWindow } from './window-manager';

let tray: Tray | null = null;

export function createAppTray(): Tray | null {
  try {
    const source = nativeImage.createFromPath(TRAY_ICON);
    if (source.isEmpty()) {
      console.warn('ASYNC tray icon image is empty, skipping tray creation.');
      return null;
    }
    const icon = source.resize({ width: 18, height: 18 });
    tray = new Tray(icon);
    tray.setToolTip(APP_NAME);
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Open ASYNC', click: () => showMainWindow() },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() },
      ])
    );
    tray.on('click', () => showMainWindow());
    return tray;
  } catch (error) {
    console.warn('Could not create system tray:', error);
    return null;
  }
}
