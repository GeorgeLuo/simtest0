# Phase 2 — Checkpoint V (Messaging) Task Queue

## Task 1: Messaging Skeletons
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint V (Stage 1)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/messaging/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Section "V. Messaging".
  - Implementation Guidelines Stage 1.
- **Objective**: Create skeleton files for messaging layer: `Bus.ts`, `outbound/Frame.ts`, `outbound/FrameFilter.ts`, `outbound/Acknowledgement.ts`, `inbound/Operation.ts`, `inbound/MessageHandler.ts`, `inbound/InboundHandlerRegistry.ts`.
- **Definition of Done**:
  1. Each file exports interfaces/classes with method stubs throwing `Not implemented` or `TODO` comments.
  2. Maintain directory structure aligning with spec (outbound/inbound folders).

## Task 2: Messaging Test Intents
- **Lifecycle**: Stage 2
- **Workspace**: `src/core/messaging/**/__tests__/`
- **Objective**: Write comment-only Jest specs describing behaviors for bus subscription, frame filtering, acknowledgement structure, operation execution, and handler registry.
- **Definition of Done**: Comments map to spec; tests compile without assertions.

## Task 3: Codify Messaging Tests
- **Lifecycle**: Stage 3
- **Objective**: Implement Jest tests covering messaging behaviors.
- **Definition of Done**:
  1. Tests verify bus register/send, frame filtering logic, acknowledgement metadata, operation invocation, and registry routing.
  2. Introduce helper mocks if needed.
  3. Tests fail with skeleton implementations.

## Task 4: Implement Messaging Components
- **Lifecycle**: Stage 4
- **Objective**: Implement messaging functionalities to satisfy tests.
- **Definition of Done**:
  1. Bus supports subscribe/unsubscribe and message dispatch.
  2. Frame structures encapsulate entity/component snapshots; filters apply component exclusions.
  3. Acknowledgements carry success/error status tied to message ids.
  4. Operations define execution contract; MessageHandler sequences operations; InboundHandlerRegistry manages handler lookup.

## Task 5: Validate Checkpoint V
- **Lifecycle**: Stage 5
- **Objective**: Run `npm run test` and `./checks.sh`, append verification log, document completion.
- **Definition of Done**:
  1. All suites pass (messaging included).
  2. Verification log updated with timestamped entry.
  3. Memory record summarizing messaging checkpoint and readiness for Checkpoint VI (IO Player).

*After Task 5, return to Tasker mindset to plan Checkpoint VI.*
