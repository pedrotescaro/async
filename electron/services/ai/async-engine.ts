import type {
  AsyncChatRequest,
  AsyncDiagnostics,
  AsyncHealth,
  ChatEffort,
  ChatSpeed,
  LocalModel,
  SetupProgress,
  TransformRequest,
  TransformResult,
} from '../../../src/lib/contracts';
import { AsyncEngineError } from './errors';
import { buildSystemPrompt } from './prompt-loader';
import {
  isRuntimeInstalled,
  missingRuntimeError,
  prepareLocalModel,
  startRuntime,
} from './runtime';

interface OllamaTagsResponse {
  models?: Array<{
    name?: string;
    model?: string;
    size?: number;
    details?: { parameter_size?: string; quantization_level?: string };
  }>;
}

interface OllamaChatChunk {
  message?: { content?: string };
  done?: boolean;
  error?: string;
}

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}

interface CompactTransformResponse {
  result?: string;
}

const DEFAULT_RUNTIME_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'async';
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_CONTENT_LENGTH = 100_000;
const MODEL_CACHE_TTL_MS = 30_000;
const MODEL_KEEP_ALIVE = '30m';
const COMPACT_TRANSFORM_SCHEMA = {
  type: 'object',
  properties: { result: { type: 'string' } },
  required: ['result'],
} as const;

const TRANSFORM_INSTRUCTIONS: Record<TransformRequest['instruction'], string> = {
  improve: 'Improve clarity and flow while preserving the original meaning and voice.',
  grammar:
    'Fix grammar, spelling, and punctuation only. Use the nearest correct spelling and never replace a misspelling with an antonym.',
  clearer: 'Make the text easier to understand without adding new claims.',
  concise: 'Make the text concise without removing essential meaning.',
  rewrite: 'Rewrite the text naturally while preserving its meaning and language.',
  translate: 'Translate faithfully while preserving tone and meaning.',
};

const TRANSFORM_SUMMARIES: Record<TransformRequest['instruction'], string> = {
  improve: 'Improved clarity and flow while preserving the original meaning.',
  grammar: 'Corrected grammar, spelling, and punctuation without changing the meaning.',
  clearer: 'Clarified the wording without adding new information.',
  concise: 'Removed unnecessary wording while preserving the essential meaning.',
  rewrite: 'Reworked the phrasing while preserving the original meaning.',
  translate: 'Translated the text while preserving its tone and meaning.',
};

function transformOptions(contentLength: number): GenerationProfile['options'] {
  if (contentLength <= 600) {
    return {
      num_ctx: 2_048,
      num_predict: Math.min(384, Math.max(64, Math.ceil(contentLength * 0.7) + 32)),
      temperature: 0,
    };
  }
  if (contentLength <= 4_000) {
    return {
      num_ctx: 4_096,
      num_predict: Math.min(1_600, Math.max(384, Math.ceil(contentLength * 0.55) + 64)),
      temperature: 0.1,
    };
  }
  return { num_ctx: 8_192, num_predict: 2_048, temperature: 0.1 };
}

export interface AsyncEngine {
  chat(request: AsyncChatRequest): AsyncIterable<string>;
  cancel(requestId: string): void;
  transform(request: TransformRequest): Promise<TransformResult>;
  health(): Promise<AsyncHealth>;
  models(): Promise<LocalModel[]>;
  setup(report: (progress: SetupProgress) => void): Promise<void>;
  diagnostics(): Promise<AsyncDiagnostics>;
}

interface GenerationProfile {
  think: boolean;
  compactPrompt: boolean;
  options: {
    num_ctx: number;
    num_predict: number;
    temperature: number;
  };
}

export class LocalAsyncEngine implements AsyncEngine {
  private readonly runtimeUrl = (process.env.ASYNC_RUNTIME_URL || DEFAULT_RUNTIME_URL).replace(
    /\/+$/,
    ''
  );

  private readonly model = process.env.ASYNC_MODEL?.trim() || DEFAULT_MODEL;
  private readonly controllers = new Map<string, AbortController>();
  private modelsCache: { tags: OllamaTagsResponse; expiresAt: number } | null = null;
  private warmupStarted = false;

  private async fetchWithTimeout(
    path: string,
    init: RequestInit = {},
    timeoutMs = REQUEST_TIMEOUT_MS
  ): Promise<Response> {
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
    const signal = init.signal
      ? AbortSignal.any([init.signal, timeoutController.signal])
      : timeoutController.signal;

    try {
      return await fetch(`${this.runtimeUrl}${path}`, { ...init, signal });
    } catch (error) {
      if (timeoutController.signal.aborted) {
        throw new AsyncEngineError('TIMEOUT', 'Local AI request timed out.', { cause: error });
      }
      if (init.signal?.aborted) {
        throw new AsyncEngineError('ABORTED', 'Local AI request was cancelled.', { cause: error });
      }
      throw new AsyncEngineError('CONNECTION_FAILED', 'Local AI runtime is unreachable.', {
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async listModels(force = false): Promise<OllamaTagsResponse> {
    if (!force && this.modelsCache && this.modelsCache.expiresAt > Date.now()) {
      return this.modelsCache.tags;
    }
    const response = await this.fetchWithTimeout('/api/tags', {}, 5_000);
    if (!response.ok) {
      throw new AsyncEngineError(
        'CONNECTION_FAILED',
        `Runtime health returned ${response.status}.`
      );
    }
    const tags = (await response.json()) as OllamaTagsResponse;
    this.modelsCache = { tags, expiresAt: Date.now() + MODEL_CACHE_TTL_MS };
    return tags;
  }

  private modelAvailable(tags: OllamaTagsResponse, model = this.model): boolean {
    return (tags.models ?? []).some((entry) => {
      const name = entry.name ?? entry.model ?? '';
      return name === model || name.startsWith(`${model}:`);
    });
  }

  private resolveModel(requested?: string): string {
    if (!requested || requested === 'auto') return this.model;
    if (requested.length > 128 || !/^[a-zA-Z0-9._:/-]+$/.test(requested)) {
      throw new AsyncEngineError('INVALID_RESPONSE', 'The selected local model is invalid.');
    }
    return requested;
  }

  private generationProfile(request: AsyncChatRequest): GenerationProfile {
    const effort: ChatEffort = request.effort ?? 'medium';
    const speed: ChatSpeed = request.speed ?? 'normal';
    const latest = request.messages.at(-1)?.content ?? '';
    const complexTask = ['code-review', 'debug'].includes(request.task ?? '');
    const largeContext = latest.length > 6_000 || request.messages.length > 6;
    const simpleRequest =
      !complexTask &&
      !largeContext &&
      latest.length <= 800 &&
      request.messages.length <= 4 &&
      !/```|stack trace|exception|\berror\b/i.test(latest);

    if (speed === 'fast' || (effort === 'low' && !largeContext) || simpleRequest) {
      return {
        think: false,
        compactPrompt: true,
        options: {
          num_ctx: largeContext ? 4_096 : 2_048,
          num_predict:
            request.responseDetail === 'detailed'
              ? 512
              : request.responseDetail === 'concise'
                ? 192
                : 320,
          temperature: 0.2,
        },
      };
    }

    if (effort === 'high' || complexTask || largeContext) {
      return {
        think: effort === 'high',
        compactPrompt: false,
        options: {
          num_ctx: 8_192,
          num_predict: request.responseDetail === 'concise' ? 512 : 1_024,
          temperature: 0.3,
        },
      };
    }

    return {
      think: false,
      compactPrompt: false,
      options: {
        num_ctx: 4_096,
        num_predict: request.responseDetail === 'concise' ? 320 : 640,
        temperature: 0.25,
      },
    };
  }

  async models(): Promise<LocalModel[]> {
    const tags = await this.listModels();
    return (tags.models ?? [])
      .map((entry) => {
        const name = entry.name ?? entry.model ?? '';
        return {
          name,
          size: entry.size,
          parameterSize: entry.details?.parameter_size,
          quantizationLevel: entry.details?.quantization_level,
          isDefault: name === this.model || name.startsWith(`${this.model}:`),
        } satisfies LocalModel;
      })
      .filter((entry) => Boolean(entry.name))
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
  }

  async health(): Promise<AsyncHealth> {
    try {
      const tags = await this.listModels();
      if (!this.modelAvailable(tags)) {
        return {
          status: 'model-missing',
          ready: false,
          message: 'ASYNC needs to finish its local setup.',
        };
      }
      this.ensureWarmModel();
      return { status: 'ready', ready: true, message: 'ASYNC is ready.' };
    } catch {
      return {
        status: 'runtime-offline',
        ready: false,
        message: "ASYNC couldn't start its local AI engine.",
      };
    }
  }

  private ensureWarmModel(): void {
    if (this.warmupStarted) return;
    this.warmupStarted = true;
    void this.fetchWithTimeout(
      '/api/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: ' ',
          stream: false,
          keep_alive: MODEL_KEEP_ALIVE,
          options: { num_ctx: 2_048, num_predict: 1, temperature: 0 },
        }),
      },
      REQUEST_TIMEOUT_MS
    ).catch(() => {
      this.warmupStarted = false;
    });
  }

  async *chat(request: AsyncChatRequest): AsyncIterable<string> {
    if (!request.requestId || request.messages.length === 0) {
      throw new AsyncEngineError('INVALID_RESPONSE', 'A request id and messages are required.');
    }
    if (request.messages.some((message) => message.content.length > MAX_CONTENT_LENGTH)) {
      throw new AsyncEngineError('INVALID_RESPONSE', 'A message exceeded the local size limit.');
    }

    const controller = new AbortController();
    this.controllers.set(request.requestId, controller);
    const profile = this.generationProfile(request);
    const systemPrompt = await buildSystemPrompt({ ...request, compact: profile.compactPrompt });
    const model = this.resolveModel(request.selectedModel);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...request.messages.map(({ role, content }) => ({ role, content })),
    ];

    try {
      const response = await this.fetchWithTimeout('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          think: profile.think,
          keep_alive: MODEL_KEEP_ALIVE,
          options: profile.options,
        }),
        signal: controller.signal,
      });
      await this.assertChatResponse(response);
      if (!response.body) {
        throw new AsyncEngineError('INVALID_RESPONSE', 'Local AI returned no stream.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const chunk = this.parseChunk(line);
          if (chunk.message?.content) yield chunk.message.content;
        }
      }
      if (buffer.trim()) {
        const chunk = this.parseChunk(buffer);
        if (chunk.message?.content) yield chunk.message.content;
      }
    } catch (error) {
      if (controller.signal.aborted && !(error instanceof AsyncEngineError)) {
        throw new AsyncEngineError('ABORTED', 'Local AI request was cancelled.', { cause: error });
      }
      throw error;
    } finally {
      this.controllers.delete(request.requestId);
    }
  }

  cancel(requestId: string): void {
    this.controllers.get(requestId)?.abort();
    this.controllers.delete(requestId);
  }

  private parseChunk(line: string): OllamaChatChunk {
    try {
      const chunk = JSON.parse(line) as OllamaChatChunk;
      if (chunk.error) {
        const code = chunk.error.toLowerCase().includes('model') ? 'MODEL_NOT_FOUND' : 'UNKNOWN';
        throw new AsyncEngineError(code, chunk.error);
      }
      return chunk;
    } catch (error) {
      if (error instanceof AsyncEngineError) throw error;
      throw new AsyncEngineError('INVALID_RESPONSE', 'Local AI stream contained invalid JSON.', {
        cause: error,
      });
    }
  }

  private async assertChatResponse(response: Response): Promise<void> {
    if (response.ok) return;
    const body = await response.text();
    if (response.status === 404 || body.toLowerCase().includes('model')) {
      throw new AsyncEngineError('MODEL_NOT_FOUND', 'The ASYNC model is not available.');
    }
    throw new AsyncEngineError('CONNECTION_FAILED', `Local AI returned ${response.status}.`);
  }

  async transform(request: TransformRequest): Promise<TransformResult> {
    const content = request.content.trim();
    if (!content || content.length > MAX_CONTENT_LENGTH) {
      throw new AsyncEngineError('INVALID_RESPONSE', 'Valid source text is required.');
    }

    const transformInstruction = [
      `Task: ${TRANSFORM_INSTRUCTIONS[request.instruction]}`,
      request.targetLanguage ? `Target language: ${request.targetLanguage}.` : '',
      'Return only JSON containing the transformed text in the result field.',
      'Text:',
      content,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await this.fetchWithTimeout('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        think: false,
        keep_alive: MODEL_KEEP_ALIVE,
        format: COMPACT_TRANSFORM_SCHEMA,
        options: transformOptions(content.length),
        messages: [
          {
            role: 'system',
            content:
              "You are a precise copy editor. Preserve the author's intended meaning, words, tone, and language. Fix only what the task requests. Return compact JSON only.",
          },
          { role: 'user', content: transformInstruction },
        ],
      }),
    });
    await this.assertChatResponse(response);
    const payload = (await response.json()) as OllamaChatResponse;
    if (payload.error) throw new AsyncEngineError('UNKNOWN', payload.error);
    return this.parseTransform(payload.message?.content ?? '', request, content);
  }

  private parseTransform(
    responseContent: string,
    request: TransformRequest,
    source: string
  ): TransformResult {
    try {
      const parsed = JSON.parse(responseContent) as CompactTransformResponse;
      const result = parsed.result?.trim();
      if (!result) throw new Error('Missing transformed text.');
      const explanation = TRANSFORM_SUMMARIES[request.instruction];
      const changed = result !== source;
      return {
        result,
        explanation,
        changes: changed
          ? [
              {
                before: source.length <= 240 ? source : undefined,
                after: result.length <= 240 ? result : undefined,
                reason: explanation,
              },
            ]
          : [],
        confidence: source.length <= 600 ? 'high' : 'medium',
      };
    } catch (error) {
      throw new AsyncEngineError('INVALID_RESPONSE', 'Transformation response was invalid.', {
        cause: error,
      });
    }
  }

  async setup(report: (progress: SetupProgress) => void): Promise<void> {
    report({ stage: 'checking', label: 'Checking the local intelligence engine...', progress: 2 });
    const installed = await isRuntimeInstalled();
    if (!installed) throw missingRuntimeError();

    let health = await this.health();
    if (health.status === 'runtime-offline') {
      report({ stage: 'starting-runtime', label: 'Starting the local intelligence engine...' });
      await startRuntime();
      for (let attempt = 0; attempt < 12; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        health = await this.health();
        if (health.status !== 'runtime-offline') break;
      }
    }

    if (!health.ready) await prepareLocalModel(report);
    report({ stage: 'verifying', label: 'Verifying ASYNC...', progress: 98 });
    const finalHealth = await this.health();
    if (!finalHealth.ready) {
      throw new AsyncEngineError('MODEL_NOT_FOUND', 'The ASYNC model could not be prepared.');
    }
    report({ stage: 'ready', label: 'ASYNC is ready.', progress: 100 });
  }

  async diagnostics(): Promise<AsyncDiagnostics> {
    const [runtimeDetected, health] = await Promise.all([isRuntimeInstalled(), this.health()]);
    return {
      runtimeDetected,
      runtimeReachable: health.status !== 'runtime-offline',
      modelAvailable: health.ready,
      runtimeUrl: this.runtimeUrl,
      model: this.model,
      platform: process.platform,
    };
  }
}
