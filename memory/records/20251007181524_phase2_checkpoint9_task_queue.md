# Phase 2 — Checkpoint IX (Sim-Eval Server Integration) Task Queue

## Task 1: Integration Skeletons & Utilities
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint IX (Stage 1)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/tools/run_integration.sh`, `src/server/index.ts`, potential `src/main.ts` entrypoint.
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — sections "Integration" and server guidance.
  - Implementation Guidelines Stage 1.
- **Objective**: Prepare integration script skeleton and ensure main entrypoint structure exists to start server with both players (placeholder).
- **Definition of Done**:
  1. `run_integration.sh` updated with commented outline of integration steps, still returning TODO placeholders.
  2. `src/server/index.ts` (or new entry file) exports initialization helpers; actual logic remains Not implemented.

## Task 2: Integration Test Intents
- **Lifecycle**: Stage 2
- **Workspace**: `tools/__tests__/` or dedicated integration test folder.
- **Objective**: Draft comment-only test script describing integration flow: start service, upload systems, start simulation, observe evaluation output.

## Task 3: Codify Integration Test Script
- **Lifecycle**: Stage 3
- **Objective**: Implement integration test (likely via Node script or Jest e2e) mocking IO/Eval players and verifying orchestration per spec.
- **Definition of Done**:
  1. Integration test script exercises server routes start-to-finish with mocked dependencies.
  2. Failures highlight gaps in route/player behavior ready for Stage 4 implementation.

## Task 4: Implement Integration Flow
- **Lifecycle**: Stage 4
- **Objective**: Flesh out server start/stop, player wiring, and integration script to satisfy Stage 3 tests.
- **Definition of Done**:
  1. Main server entrypoint fully initializes IO and evaluation players, wires buses, registers routes.
  2. Integration script runs end-to-end using mocks or in-memory data, capturing expected outputs.

## Task 5: Validate Checkpoint IX
- **Lifecycle**: Stage 5
- **Objective**: Run unit tests, integration script, `./checks.sh`, and update verification log plus memory record.
- **Definition of Done**: Test suite + integration script pass; verification log appended with timestamp; record summarizing readiness for Phase 3 / next phase.

*After Task 5, transition to Tasker for next-phase planning (Integration Test Stage completion or Phase 3 start).* 
