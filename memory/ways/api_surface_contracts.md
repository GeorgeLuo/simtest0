# API Surface Contracts

Our HTTP interface hangs off a single router rooted at `/api`, and every change assumes that contract stays intact.

- `createServer` anchors the router under `/api` and serves a JSON handshake on `/`, so new endpoints must be registered through `Router` to inherit auth, rate limiting, and JSON helpers (`workspaces/Describing_Simulation_0/src/server.ts`, `workspaces/Describing_Simulation_0/src/routes/router.ts`). The spec’s `/api/health` and `/api/status` routes are now implemented via `workspaces/Describing_Simulation_0/src/routes/system.ts`, so any future runtime metadata should flow through that module.
- Shared-secret auth and throttling are enforced inside the router and mirrored by automation via `SIMEVAL_AUTH_TOKEN`, `SIMEVAL_RATE_WINDOW_MS`, and `SIMEVAL_RATE_MAX`; the Phase 6 auth rollout (`memory/records/20251012222000_phase6_task3_auth_rate_limiting.md`) and `workspaces/Describing_Simulation_0/README.md` document the expectations that callers propagate those values.
- JSON routes respond through `res.json` after the router’s body parsing, while SSE routes flush headers and stream heartbeats (`workspaces/Describing_Simulation_0/src/routes/simulation.ts`, `workspaces/Describing_Simulation_0/src/routes/evaluation.ts`); the integration harness in `tools/run_integration.js` asserts this behavior.
- Discoverability depends on mirrored updates to `src/routes/information/` and the workspace README—Phase 3 Task 2 (`memory/records/20251007191920_phase3_task2_information_routes.md`) shows the pattern we follow whenever the API surface shifts.

When expanding the surface area, plan the work so code, documentation, and automation move in lockstep; otherwise, we break the discoverability guarantees baked into prior phases.
