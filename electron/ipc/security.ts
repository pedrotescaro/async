import { pathToFileURL } from 'node:url';
import type { IpcMainInvokeEvent } from 'electron';
import { DEV_SERVER_URL, INDEX_HTML } from '../main/constants';

export function assertTrustedRenderer(event: IpcMainInvokeEvent): void {
  const senderUrl = event.senderFrame?.url ?? '';
  if (DEV_SERVER_URL && senderUrl.startsWith(DEV_SERVER_URL)) return;
  if (senderUrl === pathToFileURL(INDEX_HTML).toString()) return;
  throw new Error('Blocked IPC request from an untrusted renderer.');
}
