import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { SetupProgress } from '../../../src/lib/contracts';
import { MODELFILE_PATH } from '../../main/constants';
import { AsyncEngineError } from './errors';

type ProgressReporter = (progress: SetupProgress) => void;

function getOllamaExecutable(): string {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const defaultWinPath = path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe');
      if (existsSync(defaultWinPath)) return defaultWinPath;
    }
    const programFiles = process.env.ProgramFiles;
    if (programFiles) {
      const progWinPath = path.join(programFiles, 'Ollama', 'ollama.exe');
      if (existsSync(progWinPath)) return progWinPath;
    }
  }
  return 'ollama';
}

function runCommand(
  args: string[],
  onOutput?: (line: string) => void,
  options: { detached?: boolean } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const executable = getOllamaExecutable();
    const child = spawn(executable, args, {
      windowsHide: true,
      stdio: options.detached ? 'ignore' : ['ignore', 'pipe', 'pipe'],
      detached: options.detached,
    });

    if (options.detached) {
      child.unref();
      resolve();
      return;
    }

    let errorOutput = '';
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (line.trim()) onOutput?.(line.trim());
      }
    });
    child.stderr?.on('data', (chunk: string) => {
      errorOutput += chunk;
      for (const line of chunk.split(/\r?\n/)) {
        if (line.trim()) onOutput?.(line.trim());
      }
    });
    child.once('error', (error) => reject(error));
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(errorOutput.trim() || `Local runtime command exited with ${code}.`));
    });
  });
}

export async function isRuntimeInstalled(): Promise<boolean> {
  try {
    await runCommand(['--version']);
    return true;
  } catch {
    return false;
  }
}

export async function startRuntime(): Promise<void> {
  await runCommand(['serve'], undefined, { detached: true });
}

function parseDownloadProgress(line: string): number | undefined {
  try {
    const parsed = JSON.parse(line) as { completed?: number; total?: number };
    if (!parsed.completed || !parsed.total) return undefined;
    return Math.min(100, Math.round((parsed.completed / parsed.total) * 100));
  } catch {
    const match = line.match(/(\d{1,3})%/);
    return match ? Math.min(100, Number(match[1])) : undefined;
  }
}

export async function prepareLocalModel(report: ProgressReporter): Promise<void> {
  report({ stage: 'downloading', label: 'Downloading the intelligence engine...', progress: 0 });
  await runCommand(['pull', 'qwen3:8b'], (line) => {
    report({
      stage: 'downloading',
      label: 'Downloading the intelligence engine...',
      progress: parseDownloadProgress(line),
    });
  });

  report({ stage: 'creating', label: 'Preparing the local model...', progress: 92 });
  await runCommand(['create', 'async', '-f', MODELFILE_PATH]);
}

export function missingRuntimeError(): AsyncEngineError {
  return new AsyncEngineError(
    'CONNECTION_FAILED',
    'The local AI runtime is not installed. Automatic runtime installation is not available yet.'
  );
}
