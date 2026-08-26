import { clipboard } from 'electron';
import type { SelectionPayload } from '../../../src/lib/contracts';

const MAX_SELECTION_LENGTH = 100_000;

/**
 * Electron has no reliable cross-platform API for reading another app's active
 * selection. This adapter deliberately reads the current clipboard and keeps
 * the platform-specific selection-capture boundary explicit for future work.
 */
export function captureSelection(): SelectionPayload | null {
  const text = clipboard.readText().trim().slice(0, MAX_SELECTION_LENGTH);
  if (!text) return null;
  return { text, source: 'clipboard' };
}
