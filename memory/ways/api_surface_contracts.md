# API Surface Contracts (2025-11-09)

The router still anchors under `/api` for auth/rate limiting, but every spec endpoint now has a canonical alias (e.g. `/simulation`, `/evaluation`, `/information/*.md`, `/codebase/*`, `/health`, `/status`) so clients can follow `Describing_Simulation_0.md` literally while existing `/api/...` consumers continue to work. When registering new routes:

- Always call `router.register('/path', handler)` so the helper mirrors it both under `/api/path` and the canonical `/path` alias; this keeps the spec-compliant surface and the historical `/api` paths in sync (`workspaces/Describing_Simulation_0/src/routes/router.ts`).
- Root discoverability now flows through the information routes: `/` returns the segments/documents JSON that previously lived at `/api`, and the doc IDs are literal filenames (e.g. `api.md`, `Describing_Simulation.md`). Keep those filenames stable whenever we re-extract documents (`workspaces/Describing_Simulation_0/src/routes/information.ts`, `src/main.ts`).
- System-level probes are enforced through `registerSystemRoutes`, so health/status additions should go there rather than inventing new prefixes.
- Shared-secret auth + rate limiting are still enforced centrally; when adding scripts or tests that hit the service, remember to pass `Authorization` and exercise both alias families so regressions surface early.

Net: treat `/api/...` as an implementation detail and `/simulation`, `/evaluation`, etc. as the user contract; every change must preserve both until we deliberately deprecate the legacy prefix.
