# Phase 6 — Task Queue Update (Post-System-ID Rollout)

## Context
- System inject/eject cycle now uses server-issued `systemId` values, satisfying Task 1 from `memory/records/20251012212500_phase6_task_queue.md`.
- Integration and benchmarking tooling validate the new contract; upcoming efforts shift toward streaming reliability and access control.

## Remaining Tasks
- **Task 2: Add SSE Heartbeats & Client Resilience**
  - Emit periodic heartbeat comments for `/api/simulation/stream` and `/api/evaluation/stream`.
  - Ensure integration tooling ignores heartbeats while still detecting idle conditions.
  - Add regression coverage for heartbeat cadence and cleanup on disconnect.
- **Task 3: Authentication & Rate Limiting Baseline**
  - Introduce configurable auth middleware (shared secret for now) in the router and require it across routes.
  - Implement lightweight per-route throttling to prevent local abuse.
  - Document usage in `routes/information/api.md` and the workspace README once implemented.
