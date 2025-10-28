# Phase 2 — Checkpoint VII (Routes & Server) Task Queue

## Task 1: Server Skeletons
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint VII (Stage 1)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/` tree for server infrastructure: `routes/router.ts`, `routes/simulation.ts`, `routes/evaluation.ts`, `routes/codebase.ts`, `server/index.ts`, plus `tools/run_integration.sh` updates as needed.
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — sections "VII. Simulation", "VIII. Evaluation", "IX. Sim-Eval Server".
  - Implementation Guidelines Stage 1.
- **Objective**: Create TypeScript skeletons for server, router, and route handlers with method stubs throwing `Not implemented` and comments referencing API expectations.

## Task 2: Test Intents for Server & Routes
- **Lifecycle**: Stage 2
- **Workspace**: `src/core/routes/__tests__/` and `src/core/server/__tests__/` (or equivalent).
- **Objective**: Author comment-only Jest specs outlining API behaviors (root index, simulation control endpoints, SSE streaming, evaluation routes, codebase browsing).

## Task 3: Codify Server & Route Tests
- **Lifecycle**: Stage 3
- **Objective**: Implement Jest tests (likely using supertest or similar) to cover:
  - Router returning index of endpoints.
  - Simulation route proxies to IOPlayer operations and SSE endpoint using outbound bus mocks.
  - Evaluation route handling frame injection.
  - Codebase route listing directory structure using in-memory file tree or mocks.

## Task 4: Implement Server & Routes
- **Lifecycle**: Stage 4
- **Objective**: Implement Express/Koa-like server (or minimal custom router) satisfying tests:
  - Define endpoints: `/`, `/simulation/*`, `/evaluation/*`, `/codebase/*`.
  - Integrate IOPlayer and EvaluationPlayer (may require additional scaffolding) with inbound/outbound buses.
  - Provide SSE streaming of frames via outbound bus.
  - Codebase route returns file listings using Node FS APIs.
  - Ensure dependency injection for testability (e.g., ability to supply mocked players/buses).

## Task 5: Validate Checkpoint VII
- **Lifecycle**: Stage 5
- **Objective**: Run `npm run test` and `./checks.sh`, append verification log, record completion.
- **Definition of Done**: All suites pass; verification log updated; memory record summarizing readiness for Checkpoint VIII (Evaluation Player) or next phase.

*After Task 5, return to Tasker mindset for Checkpoint VIII planning.*
