# System Routes Status

Per the API map, `/api/health` and `/api/status` must exist. We implemented them in `workspaces/Describing_Simulation_0/src/routes/system.ts` backed by `IOPlayer.describe()` for both simulation and evaluation players and by the package version recorded in `package.json`.

- `/api/health`: returns version, uptime, and readiness so external monitors can hit a single lightweight endpoint to confirm the process is alive.
- `/api/status`: exposes simulation/evaluation `state`, `tick`, and `systemCount` (no system IDs). This gives runtime visibility beyond the SSE stream without violating the spec’s minimal surface.

Future runtime metadata should extend `registerSystemRoutes` rather than inventing new ad-hoc endpoints to keep monitoring logic in one place.
