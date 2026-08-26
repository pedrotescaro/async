export type ContentKind =
  | 'plain_text'
  | 'code'
  | 'markdown'
  | 'error'
  | 'stack_trace'
  | 'documentation'
  | 'academic';

const CODE_SIGNALS = [
  /\b(const|let|var|function|class|interface|import|export|return|async|await)\b/,
  /=>|===|!==|\{[\s\S]*\}/,
  /<\/?[A-Z][A-Za-z0-9]*(?:\s|>)/,
];

export function detectContentKind(value: string): ContentKind {
  const content = value.trim();
  if (!content) return 'plain_text';
  if (/\bat\s+[\w.$<>]+\s*\(.+?:\d+:\d+\)/m.test(content)) return 'stack_trace';
  if (/\b(error|exception|failed|errno|traceback|panic)\b/i.test(content)) return 'error';
  if (/^#{1,6}\s|```|\[[^\]]+\]\([^)]+\)|^[-*]\s/m.test(content)) return 'markdown';
  if (CODE_SIGNALS.filter((signal) => signal.test(content)).length >= 2) return 'code';
  if (/\b(abstract|methodology|references|doi|hypothesis|literature review)\b/i.test(content)) {
    return 'academic';
  }
  if (/\b(readme|installation|usage|api reference|configuration|changelog)\b/i.test(content)) {
    return 'documentation';
  }
  return 'plain_text';
}

export interface ContextAction {
  id: string;
  label: string;
  prompt: string;
}

const TEXT_ACTIONS: ContextAction[] = [
  {
    id: 'improve',
    label: 'Improve writing',
    prompt: 'Improve this writing while preserving my voice:',
  },
  {
    id: 'grammar',
    label: 'Fix grammar',
    prompt: 'Fix the grammar and explain the most useful rule:',
  },
  { id: 'summarize', label: 'Create notes', prompt: 'Turn this into concise study notes:' },
  { id: 'explain', label: 'Explain this', prompt: 'Explain this clearly at my level:' },
];

const CODE_ACTIONS: ContextAction[] = [
  { id: 'explain-code', label: 'Explain code', prompt: 'Explain what this code does and why:' },
  {
    id: 'find-bug',
    label: 'Find a bug',
    prompt: 'Find likely bugs, explain the evidence, and suggest checks:',
  },
  {
    id: 'review',
    label: 'Review code',
    prompt: 'Review this code for correctness and maintainability:',
  },
  {
    id: 'refactor',
    label: 'Refactor',
    prompt: 'Suggest a focused refactor and explain the trade-offs:',
  },
];

const ERROR_ACTIONS: ContextAction[] = [
  { id: 'explain-error', label: 'Explain error', prompt: 'Explain this error in plain language:' },
  {
    id: 'causes',
    label: 'Possible causes',
    prompt: 'List the likely causes and how to verify each one:',
  },
  {
    id: 'fix',
    label: 'How to fix',
    prompt: 'Help me fix this step by step without assuming tests were run:',
  },
  {
    id: 'teach-why',
    label: 'Teach me why',
    prompt: 'Teach me the underlying concept behind this error:',
  },
];

export function getContextActions(kind: ContentKind): ContextAction[] {
  if (kind === 'code') return CODE_ACTIONS;
  if (kind === 'error' || kind === 'stack_trace') return ERROR_ACTIONS;
  if (kind === 'documentation' || kind === 'markdown') {
    return [
      {
        id: 'readme',
        label: 'Improve README',
        prompt: 'Improve this documentation for clarity and scanning:',
      },
      ...TEXT_ACTIONS.slice(1),
    ];
  }
  return TEXT_ACTIONS;
}
