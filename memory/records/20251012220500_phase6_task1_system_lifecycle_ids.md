# Task Record — Phase 6 Task 1 (System Lifecycle IDs)

## Summary
- Extended `Player` to issue deterministic `system-{n}` identifiers on injection and track mappings for both simulation and evaluation players (`workspaces/Describing_Simulation_0/src/core/Player.ts:19-118`), enabling HTTP callers to manage lifecycles without sharing object references.
- Updated simulation/evaluation routes to return `systemId` on inject responses and accept `{ systemId }` on eject, including proper 400/404 error handling (`workspaces/Describing_Simulation_0/src/routes/simulation.ts:12-85`, `workspaces/Describing_Simulation_0/src/routes/evaluation.ts:18-83`).
- Adjusted operation handlers, tests, and documentation to reflect the new contract (e.g., acknowledgements include optional `systemId`, integration script exercises inject→control→eject).
- Hardened tooling: benchmark harness now validates/exercises eject flow before shutdown; integration runner records the injected ID and verifies eject.

## Validation
- `npm --prefix workspaces/Describing_Simulation_0 test`
- `./tools/run_integration.sh`
- `node tools/benchmark_simulation.js`

## Artifacts
- Integration snapshot: `verifications/20251012T213158_integration.json`
- Benchmark snapshot: `verifications/20251012T213206_benchmark.json`
