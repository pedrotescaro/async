import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from './prompt-loader';

describe('buildSystemPrompt', () => {
  it('keeps the simple request prompt compact and language-adaptive', async () => {
    const prompt = await buildSystemPrompt({ task: 'teacher', compact: true });

    expect(prompt).toContain('local assistant');
    expect(prompt).toContain("user's language");
    expect(prompt.length).toBeLessThan(260);
    expect(prompt).not.toContain('User preferences:');
  });
});
