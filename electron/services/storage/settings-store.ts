import path from 'node:path';
import { app } from 'electron';
import { type AppSettings, DEFAULT_APP_SETTINGS } from '../../../src/lib/contracts';
import { DEFAULT_SHORTCUT } from '../../main/constants';
import { readJsonFile, writeJsonFile } from './json-file';

export const DEFAULT_SETTINGS: AppSettings = {
  ...DEFAULT_APP_SETTINGS,
  globalShortcut: DEFAULT_SHORTCUT,
};

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'app-data', 'settings.json');
}

function sanitizeSettings(candidate: Partial<AppSettings>): AppSettings {
  const selectedModel =
    typeof candidate.selectedModel === 'string' &&
    candidate.selectedModel.length <= 128 &&
    /^(auto|[a-zA-Z0-9._:/-]+)$/.test(candidate.selectedModel)
      ? candidate.selectedModel
      : DEFAULT_SETTINGS.selectedModel;

  return {
    launchAtStartup:
      typeof candidate.launchAtStartup === 'boolean'
        ? candidate.launchAtStartup
        : DEFAULT_SETTINGS.launchAtStartup,
    globalShortcut:
      typeof candidate.globalShortcut === 'string' && candidate.globalShortcut.length <= 64
        ? candidate.globalShortcut
        : DEFAULT_SETTINGS.globalShortcut,
    language: candidate.language === 'pt-BR' ? 'pt-BR' : 'en',
    theme: ['system', 'light', 'dark'].includes(candidate.theme ?? '')
      ? (candidate.theme as AppSettings['theme'])
      : DEFAULT_SETTINGS.theme,
    responseDetail: ['concise', 'balanced', 'detailed'].includes(candidate.responseDetail ?? '')
      ? (candidate.responseDetail as AppSettings['responseDetail'])
      : DEFAULT_SETTINGS.responseDetail,
    learningStyle: ['guided', 'examples', 'socratic'].includes(candidate.learningStyle ?? '')
      ? (candidate.learningStyle as AppSettings['learningStyle'])
      : DEFAULT_SETTINGS.learningStyle,
    codeExperience: ['beginner', 'intermediate', 'advanced'].includes(
      candidate.codeExperience ?? ''
    )
      ? (candidate.codeExperience as AppSettings['codeExperience'])
      : DEFAULT_SETTINGS.codeExperience,
    selectedModel,
    chatEffort: ['low', 'medium', 'high'].includes(candidate.chatEffort ?? '')
      ? (candidate.chatEffort as AppSettings['chatEffort'])
      : DEFAULT_SETTINGS.chatEffort,
    chatSpeed: ['normal', 'fast'].includes(candidate.chatSpeed ?? '')
      ? (candidate.chatSpeed as AppSettings['chatSpeed'])
      : DEFAULT_SETTINGS.chatSpeed,
    speechLanguage: ['auto', 'pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT'].includes(
      candidate.speechLanguage ?? ''
    )
      ? (candidate.speechLanguage as AppSettings['speechLanguage'])
      : DEFAULT_SETTINGS.speechLanguage,
    setupDismissed:
      typeof candidate.setupDismissed === 'boolean'
        ? candidate.setupDismissed
        : DEFAULT_SETTINGS.setupDismissed,
  };
}

export class SettingsStore {
  async get(): Promise<AppSettings> {
    const stored = await readJsonFile<Partial<AppSettings>>(settingsPath(), {});
    return sanitizeSettings(stored);
  }

  async save(patch: Partial<AppSettings>): Promise<AppSettings> {
    const next = sanitizeSettings({ ...(await this.get()), ...patch });
    await writeJsonFile(settingsPath(), next);
    return next;
  }
}
