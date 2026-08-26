import { globalShortcut } from 'electron';

export class ShortcutManager {
  private registeredShortcut: string | null = null;

  register(accelerator: string, callback: () => void): boolean {
    if (this.registeredShortcut) globalShortcut.unregister(this.registeredShortcut);
    const normalized = accelerator.replace(/^Ctrl\+/i, 'Control+');
    const registered = globalShortcut.register(normalized, callback);
    this.registeredShortcut = registered ? normalized : null;
    return registered;
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll();
    this.registeredShortcut = null;
  }
}
