import { describe, expect, it } from 'vitest';
import { detectContentKind, getContextActions } from './context-detection';

describe('detectContentKind', () => {
  it('detects code without treating ordinary prose as code', () => {
    expect(detectContentKind('const result = items.map((item) => { return item.id; });')).toBe(
      'code'
    );
    expect(detectContentKind('I am learning how effects work in React.')).toBe('plain_text');
  });

  it('prioritizes stack traces and errors', () => {
    expect(detectContentKind('TypeError: x is undefined\n at render (App.tsx:14:2)')).toBe(
      'stack_trace'
    );
    expect(detectContentKind('Build failed with an unexpected error')).toBe('error');
  });

  it('returns contextual actions', () => {
    expect(getContextActions('code').map((action) => action.id)).toContain('find-bug');
    expect(getContextActions('plain_text').map((action) => action.id)).toContain('improve');
  });
});
