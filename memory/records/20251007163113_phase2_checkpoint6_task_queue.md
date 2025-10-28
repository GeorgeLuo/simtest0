# Phase 2 — Checkpoint VI (IO Player) Task Queue

## Task 1: IO Player Skeletons
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint VI (Stage 1)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/core/` (vid. spec structure under `core/io player`), including `IOPlayer.ts`, operations (`operations/Start.ts`, `Pause.ts`, `Stop.ts`, `EjectSystem.ts`, `InjectSystem.ts`), outbound frame streaming.
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — section "VI. IO Player".
  - Implementation Guidelines Stage 1.
- **Objective**: Create skeleton classes extending `Player` (once available) with method stubs throwing `Not implemented`.
- **Definition of Done**:
  1. Files reflecting spec structure created with placeholder methods.
  2. Ensure imports reference existing managers/messaging components.

## Task 2: Test Intents for IO Player and Operations
- **Lifecycle**: Stage 2
- **Workspace**: `src/core/systems/__tests__/` or dedicated IO player test folder per structure (e.g., `src/core/simplayer/__tests__/`).
- **Objective**: Author comment-only tests capturing expectations: player start/pause/stop flow, bus acknowledgements, frame streaming, system injection/ejection operations.

## Task 3: Codify IO Player Tests
- **Lifecycle**: Stage 3
- **Objective**: Implement Jest tests using mocks for Bus, SystemManager, etc., covering:
  - Start/pause/stop operations invoking underlying manager methods.
  - Inject/Eject system operations interacting with SystemManager and acknowledging results.
  - Frame streaming using FrameFilter and Bus.
  - SSE-like behavior may be simplified to verifying publish calls.

## Task 4: Implement IO Player Logic
- **Lifecycle**: Stage 4
- **Objective**: Implement IOPlayer, operations, and messaging integration to satisfy tests.
- **Definition of Done**:
  1. IOPlayer controls simulation lifecycle (start/stop/pause) and ties to buses.
  2. Operations execute via InboundHandlerRegistry with Acknowledgements.
  3. Outbound frames published per tick through FrameFilter.
  4. Ensure idempotent operation handling as per spec.

## Task 5: Validate Checkpoint VI
- **Lifecycle**: Stage 5
- **Objective**: Run `npm run test` and `./checks.sh`; append verification log, record completion.
- **Definition of Done**:
  1. All tests (including IO player suite) pass.
  2. Verification log updated with new timestamp.
  3. Memory record summarizing readiness for Checkpoint VII (routes/server).

*After Task 5, return to Tasker mindset for Checkpoint VII planning.*
