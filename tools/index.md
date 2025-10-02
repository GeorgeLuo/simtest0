# Tools Index

- `checks.sh` — Repository-level entry point; invokes the current workspace integration runner to validate builds and flows.
- `workspaces/Describing_Simulation_0/tools/run_integration.sh` — Orchestrates dependency install, TypeScript build, HTTP harness (best-effort), and direct integration run while archiving artifacts under `verifications/`.
- `workspaces/Describing_Simulation_0/tools/http_integration.ts` — Spins up the server over HTTP, issues command/evaluation flows, and asserts responses; emits a chronological log for inspection.
- `workspaces/Describing_Simulation_0/tools/run_integration.ts` — Drives the simulation/evaluation players in-process, capturing baseline frames, temperature traces, and evaluation snapshots for verification.
- `workspaces/Describing_Simulation_0/tools/integration_plan.md` — Checklist describing the expected HTTP workflow exercised by the harnesses.
