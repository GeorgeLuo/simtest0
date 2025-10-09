# Phase 2 — Checkpoint VIII (Evaluation Player) Task Queue

## Task 1: Evaluation Player Skeletons
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint VIII (Stage 1)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/` (expected structure `core/evalplayer/` for `EvaluationPlayer.ts`, operations directory, and frame handling utilities).
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — section "VIII. Evaluation Player".
  - Implementation Guidelines Stage 1.
- **Objective**: Create TypeScript skeletons for evaluation player and operations with method stubs throwing `Not implemented`.
- **Definition of Done**:
  1. `EvaluationPlayer.ts` extends IOPlayer skeleton, adding injection of frames and evaluation operations (placeholders only).
  2. Operation skeletons (e.g., `InjectFrame.ts`, `RegisterCondition.ts`) created as per spec with Not implemented methods.

## Task 2: Test Intents for Evaluation Player & Operations
- **Lifecycle**: Stage 2
- **Workspace**: `src/core/evalplayer/__tests__/` and operations test folder.
- **Objective**: Draft comment-only Jest specs describing expected behaviors: frame ingestion, condition evaluation, outbound filtering, acknowledgement handling.

## Task 3: Codify Evaluation Player Tests
- **Lifecycle**: Stage 3
- **Objective**: Implement Jest tests verifying:
  - Frame injection stores frames/entities appropriately.
  - Evaluation operations trigger correct logic and acknowledgements.
  - Outbound bus receives evaluation results per spec.
  - Integration with existing messaging infrastructure (Bus/FrameFilter).

## Task 4: Implement Evaluation Player Logic
- **Lifecycle**: Stage 4
- **Objective**: Implement evaluation player behavior to satisfy tests:
  1. Manage historical frames, inject frames via operations, perform condition evaluation logic (as per spec - likely placeholder logic for now).
  2. Ensure integration with InboundHandlerRegistry and outbound bus.

## Task 5: Validate Checkpoint VIII
- **Lifecycle**: Stage 5
- **Objective**: Run `npm run test` and `./checks.sh`, append verification log, record completion.
- **Definition of Done**: Full test suite passes, verification log updated, memory record summarizing readiness for Checkpoint IX (Sim-Eval Server integration or next phase).

*After Task 5, return to Tasker mindset to plan Checkpoint IX.*
