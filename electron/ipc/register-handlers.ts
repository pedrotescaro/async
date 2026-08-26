import { app, type BrowserWindow, ipcMain, shell } from 'electron';
import type {
  AppSettings,
  AsyncChatRequest,
  HistoryItem,
  Note,
  TransformRequest,
} from '../../src/lib/contracts';
import { hideMainWindow } from '../main/window-manager';
import type { LocalAsyncEngine } from '../services/ai/async-engine';
import { toPublicAsyncError } from '../services/ai/errors';
import type { HistoryStore } from '../services/storage/history-store';
import type { NotesStore } from '../services/storage/notes-store';
import type { SettingsStore } from '../services/storage/settings-store';
import { IPC_CHANNELS } from './channels';
import { assertTrustedRenderer } from './security';

interface HandlerDependencies {
  window: BrowserWindow;
  engine: LocalAsyncEngine;
  notes: NotesStore;
  history: HistoryStore;
  settings: SettingsStore;
  onSettingsChanged: (settings: AppSettings) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseChatRequest(value: unknown): AsyncChatRequest {
  if (!isRecord(value) || typeof value.requestId !== 'string' || !Array.isArray(value.messages)) {
    throw new Error('Invalid chat request.');
  }
  return value as unknown as AsyncChatRequest;
}

function parseTransformRequest(value: unknown): TransformRequest {
  if (!isRecord(value) || typeof value.content !== 'string') {
    throw new Error('Invalid transform request.');
  }
  return value as unknown as TransformRequest;
}

export function registerIpcHandlers(dependencies: HandlerDependencies): void {
  const { window, engine, notes, history, settings, onSettingsChanged } = dependencies;

  ipcMain.on(IPC_CHANNELS.appVersion, (event) => {
    event.returnValue = app.getVersion();
  });
  ipcMain.handle(IPC_CHANNELS.appDataLocation, (event) => {
    assertTrustedRenderer(event);
    return app.getPath('userData');
  });
  ipcMain.handle(IPC_CHANNELS.appHide, (event) => {
    assertTrustedRenderer(event);
    hideMainWindow();
  });
  ipcMain.handle(IPC_CHANNELS.appOpenExternal, async (event, url: unknown) => {
    assertTrustedRenderer(event);
    if (typeof url !== 'string') throw new Error('Invalid external URL.');
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') throw new Error('Only HTTPS links are allowed.');
    await shell.openExternal(parsed.toString());
  });

  ipcMain.handle(IPC_CHANNELS.aiHealth, async (event) => {
    assertTrustedRenderer(event);
    return engine.health();
  });
  ipcMain.handle(IPC_CHANNELS.aiDiagnostics, async (event) => {
    assertTrustedRenderer(event);
    return engine.diagnostics();
  });
  ipcMain.handle(IPC_CHANNELS.aiChatCancel, (event, requestId: unknown) => {
    assertTrustedRenderer(event);
    if (typeof requestId === 'string') engine.cancel(requestId);
  });
  ipcMain.handle(IPC_CHANNELS.aiChatStart, (event, input: unknown) => {
    assertTrustedRenderer(event);
    const request = parseChatRequest(input);
    void (async () => {
      try {
        for await (const text of engine.chat(request)) {
          if (window.isDestroyed()) return;
          window.webContents.send(IPC_CHANNELS.aiChatEvent, {
            requestId: request.requestId,
            type: 'delta',
            text,
          });
        }
        if (!window.isDestroyed()) {
          window.webContents.send(IPC_CHANNELS.aiChatEvent, {
            requestId: request.requestId,
            type: 'done',
          });
        }
      } catch (error) {
        if (window.isDestroyed()) return;
        window.webContents.send(IPC_CHANNELS.aiChatEvent, {
          requestId: request.requestId,
          type: 'error',
          error: toPublicAsyncError(error),
        });
      }
    })();
  });
  ipcMain.handle(IPC_CHANNELS.aiTransform, async (event, input: unknown) => {
    assertTrustedRenderer(event);
    try {
      return await engine.transform(parseTransformRequest(input));
    } catch (error) {
      throw new Error(toPublicAsyncError(error).message);
    }
  });
  ipcMain.handle(IPC_CHANNELS.aiSetup, async (event) => {
    assertTrustedRenderer(event);
    try {
      await engine.setup((progress) => {
        if (!window.isDestroyed()) {
          window.webContents.send(IPC_CHANNELS.aiSetupProgress, progress);
        }
      });
    } catch (error) {
      const publicError = toPublicAsyncError(error);
      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.aiSetupProgress, {
          stage: 'error',
          label: publicError.message,
          error: publicError,
        });
      }
    }
  });

  ipcMain.handle(IPC_CHANNELS.notesList, (event) => {
    assertTrustedRenderer(event);
    return notes.list();
  });
  ipcMain.handle(IPC_CHANNELS.notesCreate, (event, input: unknown) => {
    assertTrustedRenderer(event);
    if (!isRecord(input) || typeof input.title !== 'string' || typeof input.content !== 'string') {
      throw new Error('Invalid note.');
    }
    return notes.create({ title: input.title, content: input.content });
  });
  ipcMain.handle(IPC_CHANNELS.notesUpdate, (event, id: unknown, patch: unknown) => {
    assertTrustedRenderer(event);
    if (typeof id !== 'string' || !isRecord(patch)) throw new Error('Invalid note update.');
    return notes.update(id, patch as Partial<Pick<Note, 'title' | 'content' | 'pinned'>>);
  });
  ipcMain.handle(IPC_CHANNELS.notesRemove, (event, id: unknown) => {
    assertTrustedRenderer(event);
    if (typeof id !== 'string') throw new Error('Invalid note id.');
    return notes.remove(id);
  });

  ipcMain.handle(IPC_CHANNELS.historyList, (event) => {
    assertTrustedRenderer(event);
    return history.list();
  });
  ipcMain.handle(IPC_CHANNELS.historySave, (event, item: unknown) => {
    assertTrustedRenderer(event);
    if (!isRecord(item) || typeof item.id !== 'string') throw new Error('Invalid history item.');
    return history.save(item as unknown as HistoryItem);
  });
  ipcMain.handle(IPC_CHANNELS.historyUpdate, (event, id: unknown, patch: unknown) => {
    assertTrustedRenderer(event);
    if (typeof id !== 'string' || !isRecord(patch)) throw new Error('Invalid history update.');
    return history.update(id, patch as Partial<Pick<HistoryItem, 'title' | 'pinned'>>);
  });
  ipcMain.handle(IPC_CHANNELS.historyRemove, (event, id: unknown) => {
    assertTrustedRenderer(event);
    if (typeof id !== 'string') throw new Error('Invalid history id.');
    return history.remove(id);
  });
  ipcMain.handle(IPC_CHANNELS.historyClear, (event) => {
    assertTrustedRenderer(event);
    return history.clear();
  });

  ipcMain.handle(IPC_CHANNELS.settingsGet, (event) => {
    assertTrustedRenderer(event);
    return settings.get();
  });
  ipcMain.handle(IPC_CHANNELS.settingsSave, async (event, patch: unknown) => {
    assertTrustedRenderer(event);
    if (!isRecord(patch)) throw new Error('Invalid settings update.');
    const next = await settings.save(patch as Partial<AppSettings>);
    onSettingsChanged(next);
    return next;
  });
}
