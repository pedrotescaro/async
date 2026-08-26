import type { PublicAsyncError } from '../../../src/lib/contracts';

export type AsyncEngineErrorCode =
  | 'ABORTED'
  | 'CONNECTION_FAILED'
  | 'INVALID_RESPONSE'
  | 'MODEL_NOT_FOUND'
  | 'TIMEOUT'
  | 'UNKNOWN';

export class AsyncEngineError extends Error {
  constructor(
    public readonly code: AsyncEngineErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'AsyncEngineError';
  }
}

export function toPublicAsyncError(error: unknown): PublicAsyncError {
  if (!(error instanceof AsyncEngineError)) {
    return {
      code: 'ASYNC_UNKNOWN',
      message: "ASYNC couldn't complete that request. Try again.",
      retryable: true,
    };
  }

  if (error.code === 'ABORTED') {
    return { code: 'ASYNC_ABORTED', message: 'Generation stopped.', retryable: false };
  }
  if (error.code === 'MODEL_NOT_FOUND') {
    return {
      code: 'ASYNC_MODEL_MISSING',
      message: 'ASYNC still needs to prepare its local intelligence engine.',
      retryable: true,
    };
  }
  if (error.code === 'TIMEOUT') {
    return {
      code: 'ASYNC_TIMEOUT',
      message: 'ASYNC took longer than expected. Try again.',
      retryable: true,
    };
  }
  if (error.code === 'INVALID_RESPONSE') {
    return {
      code: 'ASYNC_INVALID_RESPONSE',
      message: 'ASYNC returned an unexpected response. Try again.',
      retryable: true,
    };
  }
  return {
    code: 'ASYNC_OFFLINE',
    message: "ASYNC couldn't start its local AI engine.",
    retryable: true,
  };
}
