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
}): Promise<string> {
  const task = input.task === 'chat' || !input.task ? 'teacher' : input.task;
  const [base, specialist] = await Promise.all([readPrompt('base'), readPrompt(task)]);
  const preferences = [
    `Response detail: ${input.responseDetail ?? 'balanced'}.`,
    `Learning style: ${input.learningStyle ?? 'guided'}.`,
    `Code experience: ${input.codeExperience ?? 'intermediate'}.`,
  ].join('\n');
  return `${base}\n\n${specialist}\n\nUser preferences:\n${preferences}`;
}
