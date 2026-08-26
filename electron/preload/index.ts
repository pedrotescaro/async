import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppSettings,
  AsyncChatEvent,
  AsyncChatRequest,
  AsyncDiagnostics,
  AsyncHealth,
  DesktopApi,
  HistoryItem,
  Note,
  SelectionPayload,
  SetupProgress,
  TransformRequest,
  TransformResult,
} from '../../src/lib/contracts';
import { IPC_CHANNELS } from '../ipc/channels';

function subscribe<T>(channel: string, callback: (value: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, value: T) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: DesktopApi = {
  platform: process.platform,
  app: {
    hide: () => ipcRenderer.invoke(IPC_CHANNELS.appHide),
    getVersion: () => ipcRenderer.sendSync(IPC_CHANNELS.appVersion) as string,
    getDataLocation: () => ipcRenderer.invoke(IPC_CHANNELS.appDataLocation) as Promise<string>,
    openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.appOpenExternal, url),
    onSelection: (callback) =>
      subscribe<SelectionPayload>(IPC_CHANNELS.selectionCaptured, callback),
  },
  ai: {
    health: () => ipcRenderer.invoke(IPC_CHANNELS.aiHealth) as Promise<AsyncHealth>,
    startChat: (request: AsyncChatRequest) => ipcRenderer.invoke(IPC_CHANNELS.aiChatStart, request),
    cancelChat: (requestId) => ipcRenderer.invoke(IPC_CHANNELS.aiChatCancel, requestId),
    onChatEvent: (callback) => subscribe<AsyncChatEvent>(IPC_CHANNELS.aiChatEvent, callback),
    transform: (request: TransformRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.aiTransform, request) as Promise<TransformResult>,
    setup: () => ipcRenderer.invoke(IPC_CHANNELS.aiSetup),
    onSetupProgress: (callback) => subscribe<SetupProgress>(IPC_CHANNELS.aiSetupProgress, callback),
    diagnostics: () => ipcRenderer.invoke(IPC_CHANNELS.aiDiagnostics) as Promise<AsyncDiagnostics>,
  },
  notes: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.notesList) as Promise<Note[]>,
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.notesCreate, input) as Promise<Note>,
    update: (id, patch) => ipcRenderer.invoke(IPC_CHANNELS.notesUpdate, id, patch) as Promise<Note>,
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.notesRemove, id),
  },
  history: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.historyList) as Promise<HistoryItem[]>,
    save: (item) => ipcRenderer.invoke(IPC_CHANNELS.historySave, item) as Promise<HistoryItem>,
    update: (id, patch) =>
      ipcRenderer.invoke(IPC_CHANNELS.historyUpdate, id, patch) as Promise<HistoryItem>,
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.historyRemove, id),
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.historyClear),
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet) as Promise<AppSettings>,
    save: (patch) => ipcRenderer.invoke(IPC_CHANNELS.settingsSave, patch) as Promise<AppSettings>,
  },
};

contextBridge.exposeInMainWorld('asyncDesktop', api);
