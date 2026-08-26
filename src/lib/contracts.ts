export type AsyncRole = 'system' | 'user' | 'assistant';

export interface AsyncMessage {
  id?: string;
  role: Exclude<AsyncRole, 'system'>;
  content: string;
  createdAt?: string;
}

export type AsyncTask =
  | 'chat'
  | 'writing'
  | 'teacher'
  | 'code-review'
  | 'debug'
  | 'translation'
  | 'summarization';

export interface AsyncChatRequest {
  requestId: string;
  messages: AsyncMessage[];
  task?: AsyncTask;
  responseDetail?: ResponseDetail;
  learningStyle?: LearningStyle;
  codeExperience?: CodeExperience;
}

export interface AsyncChatEvent {
  requestId: string;
  type: 'delta' | 'done' | 'error';
  text?: string;
  error?: PublicAsyncError;
}

export interface TransformRequest {
  content: string;
  instruction: 'improve' | 'grammar' | 'clearer' | 'concise' | 'rewrite' | 'translate';
  targetLanguage?: string;
}

export interface TransformChange {
  before?: string;
  after?: string;
  reason: string;
}

export interface TransformResult {
  result: string;
  changes: TransformChange[];
  explanation: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface AsyncHealth {
  status: 'ready' | 'runtime-offline' | 'model-missing' | 'checking';
  ready: boolean;
  message: string;
}

export interface PublicAsyncError {
  code:
    | 'ASYNC_ABORTED'
    | 'ASYNC_OFFLINE'
    | 'ASYNC_MODEL_MISSING'
    | 'ASYNC_INVALID_RESPONSE'
    | 'ASYNC_TIMEOUT'
    | 'ASYNC_UNKNOWN';
  message: string;
  retryable: boolean;
}

export interface SetupProgress {
  stage:
    | 'checking'
    | 'starting-runtime'
    | 'downloading'
    | 'creating'
    | 'verifying'
    | 'ready'
    | 'error';
  label: string;
  progress?: number;
  error?: PublicAsyncError;
}

export interface AsyncDiagnostics {
  runtimeDetected: boolean;
  runtimeReachable: boolean;
  modelAvailable: boolean;
  runtimeUrl: string;
  model: string;
  platform: NodeJS.Platform;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

export interface HistoryItem {
  id: string;
  title: string;
  messages: AsyncMessage[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  task: AsyncTask;
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResponseDetail = 'concise' | 'balanced' | 'detailed';
export type LearningStyle = 'guided' | 'examples' | 'socratic';
export type CodeExperience = 'beginner' | 'intermediate' | 'advanced';

export interface AppSettings {
  launchAtStartup: boolean;
  globalShortcut: string;
  language: 'en' | 'pt-BR';
  theme: ThemePreference;
  responseDetail: ResponseDetail;
  learningStyle: LearningStyle;
  codeExperience: CodeExperience;
  setupDismissed: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  launchAtStartup: false,
  globalShortcut: 'Control+Alt+A',
  language: 'en',
  theme: 'dark',
  responseDetail: 'balanced',
  learningStyle: 'guided',
  codeExperience: 'intermediate',
  setupDismissed: false,
};

export interface SelectionPayload {
  text: string;
  source: 'clipboard';
}

export interface DesktopApi {
  platform: NodeJS.Platform;
  app: {
    hide(): Promise<void>;
    getVersion(): string;
    getDataLocation(): Promise<string>;
    openExternal(url: string): Promise<void>;
    onSelection(callback: (payload: SelectionPayload) => void): () => void;
  };
  ai: {
    health(): Promise<AsyncHealth>;
    startChat(request: AsyncChatRequest): Promise<void>;
    cancelChat(requestId: string): Promise<void>;
    onChatEvent(callback: (event: AsyncChatEvent) => void): () => void;
    transform(request: TransformRequest): Promise<TransformResult>;
    setup(): Promise<void>;
    onSetupProgress(callback: (progress: SetupProgress) => void): () => void;
    diagnostics(): Promise<AsyncDiagnostics>;
  };
  notes: {
    list(): Promise<Note[]>;
    create(input: Pick<Note, 'title' | 'content'>): Promise<Note>;
    update(id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'pinned'>>): Promise<Note>;
    remove(id: string): Promise<void>;
  };
  history: {
    list(): Promise<HistoryItem[]>;
    save(item: HistoryItem): Promise<HistoryItem>;
    update(id: string, patch: Partial<Pick<HistoryItem, 'title' | 'pinned'>>): Promise<HistoryItem>;
    remove(id: string): Promise<void>;
    clear(): Promise<void>;
  };
  settings: {
    get(): Promise<AppSettings>;
    save(patch: Partial<AppSettings>): Promise<AppSettings>;
  };
}
