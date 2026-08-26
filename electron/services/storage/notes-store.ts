import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import type { Note } from '../../../src/lib/contracts';

const NOTE_EXTENSION = '.md';

function notesPath(): string {
  return path.join(app.getPath('userData'), 'notes');
}

function notePath(id: string): string {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('Invalid note id.');
  return path.join(notesPath(), `${id}${NOTE_EXTENSION}`);
}

function serializeNote(note: Note): string {
  const metadata = JSON.stringify({
    title: note.title,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    pinned: note.pinned,
  });
  return `<!-- async-note:${metadata} -->\n\n${note.content.trimEnd()}\n`;
}

function parseNote(id: string, source: string): Note | null {
  const match = source.match(/^<!-- async-note:(.+) -->\r?\n\r?\n/);
  if (!match) return null;
  try {
    const metadata = JSON.parse(match[1]) as Omit<Note, 'id' | 'content'>;
    if (!metadata.title || !metadata.createdAt || !metadata.updatedAt) return null;
    return {
      id,
      title: metadata.title,
      content: source.slice(match[0].length).replace(/\r?\n$/, ''),
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      pinned: Boolean(metadata.pinned),
    };
  } catch {
    return null;
  }
}

async function persist(note: Note): Promise<void> {
  await mkdir(notesPath(), { recursive: true });
  const target = notePath(note.id);
  const content = serializeNote(note);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, content, 'utf8');
  try {
    await rename(temporary, target);
  } catch {
    await writeFile(target, content, 'utf8');
    await unlink(temporary).catch(() => {});
  }
}

export class NotesStore {
  async list(): Promise<Note[]> {
    await mkdir(notesPath(), { recursive: true });
    const files = await readdir(notesPath());
    const notes = await Promise.all(
      files
        .filter((file) => file.endsWith(NOTE_EXTENSION))
        .map(async (file) => {
          const id = file.slice(0, -NOTE_EXTENSION.length);
          try {
            return parseNote(id, await readFile(notePath(id), 'utf8'));
          } catch {
            return null;
          }
        })
    );
    return notes
      .filter((note): note is Note => note !== null)
      .sort((left, right) => {
        if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }

  async create(input: Pick<Note, 'title' | 'content'>): Promise<Note> {
    const timestamp = new Date().toISOString();
    const note: Note = {
      id: randomUUID(),
      title: input.title.trim().slice(0, 120) || 'Untitled note',
      content: input.content.slice(0, 500_000),
      createdAt: timestamp,
      updatedAt: timestamp,
      pinned: false,
    };
    await persist(note);
    return note;
  }

  async update(
    id: string,
    patch: Partial<Pick<Note, 'title' | 'content' | 'pinned'>>
  ): Promise<Note> {
    const current = parseNote(id, await readFile(notePath(id), 'utf8'));
    if (!current) throw new Error('Note not found.');
    const next: Note = {
      ...current,
      title:
        typeof patch.title === 'string'
          ? patch.title.trim().slice(0, 120) || 'Untitled note'
          : current.title,
      content:
        typeof patch.content === 'string' ? patch.content.slice(0, 500_000) : current.content,
      pinned: typeof patch.pinned === 'boolean' ? patch.pinned : current.pinned,
      updatedAt: new Date().toISOString(),
    };
    await persist(next);
    return next;
  }

  async remove(id: string): Promise<void> {
    await unlink(notePath(id));
  }
}
