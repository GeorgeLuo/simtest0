# Phase 2 — Checkpoint IV (Orchestration) Task Queue

## Task 1: SystemManager Skeleton
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint IV (Stage 1)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/systems/SystemManager.ts`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Section "IV. Orchestration".
  - Implementation Guidelines Stage 1.
- **Objective**: Create skeleton for `SystemManager` reflecting responsibilities (register systems, maintain order, trigger hooks).
- **Definition of Done**:
  1. `SystemManager` file exports class with method stubs (`addSystem`, `removeSystem`, `getSystems`, `runCycle`, etc.) throwing `Not implemented` and doc comments referencing spec.
  2. No logic yet; ensures dependency on `EntityManager`, `ComponentManager`, and `System` types.

## Task 2: Test Intents for SystemManager
- **Lifecycle**: Stage 2
- **Workspace**: `src/core/systems/__tests__/SystemManager.test.ts`
- **Objective**: Draft comment-only tests describing expectations (hook ordering, insertion indices, removal behavior, execution order).
- **Definition of Done**: Comments link to spec; compile without assertions.

## Task 3: Codify SystemManager Tests
- **Lifecycle**: Stage 3
- **Objective**: Implement Jest tests verifying system registration order, lifecycle hook invocations, and update execution.
- **Definition of Done**:
  1. Tests use mock systems to capture calls.
  2. Confirm removal cancels future updates and triggers destroy.
  3. Tests fail with skeleton implementation.

## Task 4: Implement SystemManager
- **Lifecycle**: Stage 4
- **Objective**: Implement manager logic to satisfy tests.
- **Definition of Done**:
  1. Maintains ordered array of systems; supports insertion indices.
  2. `runCycle` iterates systems calling `update` with shared context.
  3. Hooks `initialize`/`destroy` invoked appropriately when systems added/removed.
  4. Provides accessors for current system list.

## Task 5: Validate Checkpoint IV
- **Lifecycle**: Stage 5
- **Objective**: Run `npm run test` and `./checks.sh`, append verification log, and write memory record.
- **Definition of Done**:
  1. All suites pass.
  2. Verification log updated with timestamp.
  3. Memory record summarizing orchestration progress, noting readiness for Checkpoint V (Messaging).

*After Task 5, switch to Tasker mindset for Checkpoint V planning.*
