import type {
  AsyncChatRequest,
  AsyncDiagnostics,
  AsyncHealth,
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
  models?: Array<{ name?: string; model?: string }>;
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

const DEFAULT_RUNTIME_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'async';
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_CONTENT_LENGTH = 100_000;

export interface AsyncEngine {
  chat(request: AsyncChatRequest): AsyncIterable<string>;
  cancel(requestId: string): void;
  transform(request: TransformRequest): Promise<TransformResult>;
  health(): Promise<AsyncHealth>;
  setup(report: (progress: SetupProgress) => void): Promise<void>;
  diagnostics(): Promise<AsyncDiagnostics>;
}

export class LocalAsyncEngine implements AsyncEngine {
  private readonly runtimeUrl = (process.env.ASYNC_RUNTIME_URL || DEFAULT_RUNTIME_URL).replace(
    /\/+$/,
    ''
  );

  private readonly model = process.env.ASYNC_MODEL?.trim() || DEFAULT_MODEL;
  private readonly controllers = new Map<string, AbortController>();

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

  private async listModels(): Promise<OllamaTagsResponse> {
    const response = await this.fetchWithTimeout('/api/tags', {}, 5_000);
    if (!response.ok) {
      throw new AsyncEngineError(
        'CONNECTION_FAILED',
        `Runtime health returned ${response.status}.`
      );
    }
    return (await response.json()) as OllamaTagsResponse;
  }

  private modelAvailable(tags: OllamaTagsResponse): boolean {
    return (tags.models ?? []).some((entry) => {
      const name = entry.name ?? entry.model ?? '';
      return name === this.model || name.startsWith(`${this.model}:`);
    });
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
      return { status: 'ready', ready: true, message: 'ASYNC is ready.' };
    } catch {
      return {
        status: 'runtime-offline',
        ready: false,
        message: "ASYNC couldn't start its local AI engine.",
      };
    }
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
    const systemPrompt = await buildSystemPrompt(request);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...request.messages.map(({ role, content }) => ({ role, content })),
    ];

    try {
      const response = await this.fetchWithTimeout('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, messages, stream: true }),
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

    const systemPrompt = await buildSystemPrompt({ task: 'writing' });
    const schemaInstruction = [
      `Transform instruction: ${request.instruction}.`,
      request.targetLanguage ? `Target language: ${request.targetLanguage}.` : '',
      'Return only JSON with this exact shape:',
      '{"result":"...","changes":[{"before":"...","after":"...","reason":"..."}],"explanation":"...","confidence":"low|medium|high"}',
      'Source:',
      content,
    ]
      .filter(Boolean)
      .join('\n\n');

    const response = await this.fetchWithTimeout('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: 'json',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: schemaInstruction },
        ],
      }),
    });
    await this.assertChatResponse(response);
    const payload = (await response.json()) as OllamaChatResponse;
    if (payload.error) throw new AsyncEngineError('UNKNOWN', payload.error);
    return this.parseTransform(payload.message?.content ?? '');
  }

  private parseTransform(content: string): TransformResult {
    try {
      const parsed = JSON.parse(content) as Partial<TransformResult>;
      if (!parsed.result || !parsed.explanation || !Array.isArray(parsed.changes)) {
        throw new Error('Missing transformation fields.');
      }
      const confidence = ['low', 'medium', 'high'].includes(parsed.confidence ?? '')
        ? parsed.confidence
        : 'medium';
      return {
        result: parsed.result,
        explanation: parsed.explanation,
        changes: parsed.changes.filter(
          (change): change is TransformResult['changes'][number] =>
            typeof change?.reason === 'string'
        ),
        confidence: confidence as TransformResult['confidence'],
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
