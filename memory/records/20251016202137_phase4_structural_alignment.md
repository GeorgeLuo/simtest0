# Phase 4 Structural Alignment Refresh

- Relocated informational markdown to `workspaces/Describing_Simulation_0/src/routes/information/`, renamed `api.md` to match spec casing, and promoted the route module to `information/index.ts` so the directory mirrors the documented layout; updated imports/tests accordingly.
- Added `workspaces/Describing_Simulation_0/src/server.ts` as a thin re-export of `server/Server.ts`, satisfying the top-level file expected by the repository structure guide without disturbing existing module boundaries.
- Reworked plugins into `plugins/{simulation,evaluation}/{components,systems,operations}/`, moved existing simulation assets into the new tree, and rewired codebase routes tests plus `tools/run_integration.sh` so uploads land under `plugins/simulation/...`.
- Executed `./checks.sh --integration`, producing `verifications/checks_20251016T202046Z.log` and a fresh integration capture at `verifications/integration_20251016T132048/`, confirming the server, tests, and integration workflow remain green after the structural changes.
