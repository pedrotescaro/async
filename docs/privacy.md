# Privacy model

ASYNC is designed as a local-first application and does not require an account in the first release.

## Local data domains

- **App data:** theme, language, shortcut, launch behavior, and learning preferences.
- **Chat history:** conversations saved by the history service.
- **Notes:** local Markdown files with stable identifiers.
- **AI runtime:** model and runtime state managed independently from user content stores.

## AI processing

The default architecture sends prompts from Electron main to a loopback-only local AI endpoint. The renderer cannot call that endpoint directly. If a developer overrides `ASYNC_RUNTIME_URL`, processing occurs at that configured destination; therefore the project does not claim that every custom configuration is private or offline.

## Telemetry

The MVP includes no analytics SDK and no mandatory remote account. The update service contacts GitHub Releases only in packaged builds that support auto-update.

## Clearing data

Settings includes controls to clear chat history and notes. Deletions are permanent filesystem operations in the current MVP; export and trash/recovery support remain roadmap items.
