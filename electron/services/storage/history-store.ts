import path from 'node:path';
import { app } from 'electron';
import type { HistoryItem } from '../../../src/lib/contracts';
import { readJsonFile, writeJsonFile } from './json-file';

function historyPath(): string {
  return path.join(app.getPath('userData'), 'chat-history', 'history.json');
}

function sortHistory(items: HistoryItem[]): HistoryItem[] {
  return [...items].sort((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export class HistoryStore {
  async list(): Promise<HistoryItem[]> {
    return sortHistory(await readJsonFile<HistoryItem[]>(historyPath(), []));
  }

  async save(item: HistoryItem): Promise<HistoryItem> {
    const items = await this.list();
    const sanitized: HistoryItem = {
      ...item,
      title: item.title.trim().slice(0, 120) || 'Conversation with ASYNC',
      messages: item.messages.slice(-200),
    };
    const next = [sanitized, ...items.filter((candidate) => candidate.id !== item.id)];
    await writeJsonFile(historyPath(), next.slice(0, 500));
    return sanitized;
  }

  async update(
    id: string,
    patch: Partial<Pick<HistoryItem, 'title' | 'pinned'>>
  ): Promise<HistoryItem> {
    const items = await this.list();
    const current = items.find((item) => item.id === id);
    if (!current) throw new Error('History item not found.');
    const next: HistoryItem = {
      ...current,
      title:
        typeof patch.title === 'string'
          ? patch.title.trim().slice(0, 120) || current.title
          : current.title,
      pinned: typeof patch.pinned === 'boolean' ? patch.pinned : current.pinned,
      updatedAt: new Date().toISOString(),
    };
    await writeJsonFile(
      historyPath(),
      items.map((item) => (item.id === id ? next : item))
    );
    return next;
  }

  async remove(id: string): Promise<void> {
    const items = await this.list();
    await writeJsonFile(
      historyPath(),
      items.filter((item) => item.id !== id)
    );
  }

  async clear(): Promise<void> {
    await writeJsonFile(historyPath(), []);
  }
}
