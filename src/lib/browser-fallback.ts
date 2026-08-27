import {
  type AppSettings,
  DEFAULT_APP_SETTINGS,
  type DesktopApi,
  type HistoryItem,
  type Note,
} from './contracts';

function getStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function ensureDesktopApi(): DesktopApi {
  if (typeof window !== 'undefined' && window.asyncDesktop) {
    return window.asyncDesktop;
  }

  const fallbackApi: DesktopApi = {
    platform: 'win32',
    app: {
      hide: async () => {},
      toggleMaximize: async () => ({ maximized: false, fullScreen: false }),
      toggleFullScreen: async () => ({ maximized: false, fullScreen: false }),
      getWindowState: async () => ({ maximized: false, fullScreen: false }),
      getVersion: () => '0.2.0',
      getDataLocation: async () => 'LocalStorage (Browser Mode)',
      openExternal: async (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      onSelection: () => () => {},
      onWindowState: () => () => {},
    },
    ai: {
      health: async () => ({
        status: 'ready',
        ready: true,
        message: 'Running in Web Preview Mode.',
      }),
      models: async () => [],
      startChat: async () => {},
      cancelChat: async () => {},
      onChatEvent: () => () => {},
      transform: async (request) => ({
        result: request.content,
        changes: [],
        explanation: 'Web mode: AI engine requires desktop app with Ollama.',
        confidence: 'high',
      }),
      setup: async () => {},
      onSetupProgress: () => () => {},
      diagnostics: async () => ({
        runtimeDetected: false,
        runtimeReachable: false,
        modelAvailable: false,
        runtimeUrl: 'http://localhost:11434',
        model: 'qwen3:8b',
        platform: 'win32',
      }),
    },
    notes: {
      list: async () => getStorage<Note[]>('async_notes', []),
      create: async (input) => {
        const notes = getStorage<Note[]>('async_notes', []);
        const newNote: Note = {
          id: crypto.randomUUID(),
          title: input.title,
          content: input.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pinned: false,
        };
        const updated = [newNote, ...notes];
        setStorage('async_notes', updated);
        return newNote;
      },
      update: async (id, patch) => {
        const notes = getStorage<Note[]>('async_notes', []);
        const index = notes.findIndex((n) => n.id === id);
        if (index === -1) throw new Error('Note not found');
        const updatedNote: Note = {
          ...notes[index],
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        notes[index] = updatedNote;
        setStorage('async_notes', notes);
        return updatedNote;
      },
      remove: async (id) => {
        const notes = getStorage<Note[]>('async_notes', []);
        setStorage(
          'async_notes',
          notes.filter((n) => n.id !== id)
        );
      },
    },
    history: {
      list: async () => getStorage<HistoryItem[]>('async_history', []),
      save: async (item) => {
        const history = getStorage<HistoryItem[]>('async_history', []);
        const index = history.findIndex((h) => h.id === item.id);
        const updated =
          index >= 0 ? history.map((h, i) => (i === index ? item : h)) : [item, ...history];
        setStorage('async_history', updated);
        return item;
      },
      update: async (id, patch) => {
        const history = getStorage<HistoryItem[]>('async_history', []);
        const index = history.findIndex((h) => h.id === id);
        if (index === -1) throw new Error('History item not found');
        const updatedItem = {
          ...history[index],
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        history[index] = updatedItem;
        setStorage('async_history', history);
        return updatedItem;
      },
      remove: async (id) => {
        const history = getStorage<HistoryItem[]>('async_history', []);
        setStorage(
          'async_history',
          history.filter((h) => h.id !== id)
        );
      },
      clear: async () => {
        setStorage('async_history', []);
      },
    },
    settings: {
      get: async () => ({
        ...DEFAULT_APP_SETTINGS,
        ...getStorage<Partial<AppSettings>>('async_settings', {}),
      }),
      save: async (patch) => {
        const current = {
          ...DEFAULT_APP_SETTINGS,
          ...getStorage<Partial<AppSettings>>('async_settings', {}),
        };
        const updated = { ...current, ...patch };
        setStorage('async_settings', updated);
        return updated;
      },
    },
  };

  if (typeof window !== 'undefined') {
    window.asyncDesktop = fallbackApi;
  }

  return fallbackApi;
}

if (typeof window !== 'undefined' && !window.asyncDesktop) {
  ensureDesktopApi();
}
