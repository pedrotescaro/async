# ASYNC architecture

## Boundaries

The renderer is untrusted by design. It has no Node.js integration and cannot call a local inference endpoint. `contextIsolation` and the Electron sandbox are enabled. A narrow preload bridge exposes validated operations for AI, storage, settings, and application lifecycle.

```text
Renderer → preload contract → IPC authorization → service → local resource
```

Each IPC handler verifies its sender. External navigation is blocked inside the application window and HTTPS links open through the operating system browser.

## AsyncEngine

`LocalAsyncEngine` implements the product contract:

- `chat()` returns an async stream of text chunks;
- `cancel()` aborts one request without affecting other UI work;
- `transform()` requests and validates a structured writing result;
- `health()` reports product-level availability;
- `setup()` reports product-level progress;
- `diagnostics()` exposes technical state only on the Diagnostics screen.

The main interface uses ASYNC terminology. The runtime URL and provider configuration remain main-process-only and can change without a frontend migration. The preload bridge exposes only a sanitized inventory of installed local model names and accepts a validated model name, effort, and speed with each request.

The engine caches the runtime model inventory briefly, warms the automatic ASYNC model after a successful health check, and keeps active models loaded for 30 minutes. It selects compact generation limits for simple/fast requests and preserves larger context and optional reasoning for complex or high-effort work.

## Runtime setup

The current setup service:

1. detects whether the runtime executable exists;
2. starts the local service when installed but offline;
3. downloads the configured base model;
4. creates the logical `async` model from `ai/Modelfile`;
5. verifies health and model availability.

Automatic installation of a missing runtime is not implemented because a production version requires signed, platform-specific installers and explicit user consent. That future behavior belongs in `electron/services/ai/runtime.ts`, not in React.

## Storage

- Settings: atomic JSON under `appData/settings.json`.
- Notes: individual Markdown files with a small HTML-comment metadata envelope and stable UUIDs.
- Chat history: bounded atomic JSON under `chat-history/history.json`.
- AI runtime: managed outside the renderer through the runtime service.

The storage services can later be replaced with SQLite or optional sync without changing the UI contract.

## Shortcut and selection

The configurable global shortcut is registered in Electron main. On activation the window is shown and focused. Cross-application active-selection capture is intentionally represented by a dedicated adapter. The MVP reads current clipboard text because Electron has no reliable universal selection API; platform-native adapters can replace it later.

## Landing page

The product site is a separate Vite entry in `landing/`. It shares official public logo assets but no Electron code. Its hero demo is deterministic, honors `prefers-reduced-motion`, and adapts its composition rather than shrinking a desktop screenshot on mobile.
