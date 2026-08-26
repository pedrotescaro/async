# Contributing to ASYNC

Thank you for helping build a calm, educational desktop assistant.

## Before opening a change

1. Keep the product identity ASYNC-only. Do not add provider pickers, API key fields, or model selectors to the renderer.
2. Keep AI calls in Electron main behind `AsyncEngine`.
3. Preserve the monochrome design system: black, white, and neutral grays only.
4. Treat educational behavior as a product requirement, not only a prompt detail.
5. Do not claim execution, test success, privacy guarantees, or platform support without evidence.

## Development

```bash
bun install
bun run typecheck
bun run lint
bun run test
bun run build
```

Use small Conventional Commits such as `feat(chat): add streaming cancellation` or `fix(notes): preserve pinned ordering`.

## Pull requests

- Explain the user-visible behavior.
- Include the validation commands you actually ran.
- Add or update tests for behavior changes.
- For visual work, include desktop and mobile evidence and verify reduced motion.
- Keep unrelated work out of the diff.
