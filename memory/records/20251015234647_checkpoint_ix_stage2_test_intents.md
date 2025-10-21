# Checkpoint IX Stage 2 Test Intents

- Authored comment-only Vitest specs for server, router, and routes to capture expected behaviors before implementation:
  - `src/main.test.ts` outlines bootstrap expectations for `main`/`createServer`.
  - `src/server/__tests__/Server.test.ts` describes lifecycle handling and dependency wiring.
  - `src/routes/__tests__/router.test.ts` through `system.test.ts` enumerate endpoint behaviors across simulation, evaluation, codebase, information, and system surfaces.
- No executable assertions were added, preserving the TDD cadence ahead of Stage 3.
