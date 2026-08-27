import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  AsyncTask,
  CodeExperience,
  LearningStyle,
  ResponseDetail,
} from '../../../src/lib/contracts';
import { PROMPTS_PATH } from '../../main/constants';

const promptCache = new Map<string, string>();

async function readPrompt(name: string): Promise<string> {
  const cached = promptCache.get(name);
  if (cached) return cached;
  const prompt = (await readFile(path.join(PROMPTS_PATH, `${name}.md`), 'utf8')).trim();
  promptCache.set(name, prompt);
  return prompt;
}

export async function buildSystemPrompt(input: {
  task?: AsyncTask;
  responseDetail?: ResponseDetail;
  learningStyle?: LearningStyle;
  codeExperience?: CodeExperience;
  compact?: boolean;
}): Promise<string> {
  const task = input.task === 'chat' || !input.task ? 'teacher' : input.task;
  if (input.compact) {
    const compactRole: Partial<Record<AsyncTask, string>> = {
      teacher: 'Explain clearly and use a small example only when it helps.',
      writing: 'Improve the text while preserving its meaning.',
      translation: 'Translate faithfully and preserve tone.',
      summarization: 'Keep only the essential information.',
    };
    return [
      "You are ASYNC, a local assistant. Answer accurately and concisely in the user's language.",
      'Never claim unverified actions or reveal private reasoning.',
      compactRole[task],
    ]
      .filter(Boolean)
      .join(' ');
  }
  const [base, specialist] = await Promise.all([readPrompt('base'), readPrompt(task)]);
  const preferences = [
    `Response detail: ${input.responseDetail ?? 'balanced'}.`,
    `Learning style: ${input.learningStyle ?? 'guided'}.`,
    `Code experience: ${input.codeExperience ?? 'intermediate'}.`,
  ].join('\n');
  return `${base}\n\n${specialist}\n\nUser preferences:\n${preferences}`;
}
