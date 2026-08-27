import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalAsyncEngine } from './async-engine';

describe('LocalAsyncEngine writing transformations', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the compact profile for short writing corrections', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: { content: '{"result":"Olá, estou errado."}' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await new LocalAsyncEngine().transform({
      content: 'Olá, estou erado.',
      instruction: 'grammar',
    });

    expect(result).toEqual({
      result: 'Olá, estou errado.',
      explanation: 'Corrected grammar, spelling, and punctuation without changing the meaning.',
      changes: [
        {
          before: 'Olá, estou erado.',
          after: 'Olá, estou errado.',
          reason: 'Corrected grammar, spelling, and punctuation without changing the meaning.',
        },
      ],
      confidence: 'high',
    });

    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.options).toMatchObject({ num_ctx: 2_048, temperature: 0 });
    expect(request.options.num_predict).toBeLessThan(100);
    expect(request.format.required).toEqual(['result']);
    expect(request.messages[0].content.length).toBeLessThan(180);
  });
});
