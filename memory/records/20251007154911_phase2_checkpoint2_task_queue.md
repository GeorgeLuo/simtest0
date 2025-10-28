# Phase 2 — Checkpoint II (System) Task Queue

## Task 1: Systems Directory & Skeleton
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint II (Stage 1)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/systems/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Section "II. System" and surrounding context.
  - `instruction_documents/Describing_Simulation_0_implementation_guidelines.md` — Stage 1 skeleton guidance.
- **Objective**: Establish the `systems` directory with a base `System` abstract class skeleton exposing lifecycle hooks (`initialize`, `update`, `destroy`).
- **Definition of Done**:
  1. `System.ts` exports an abstract class or interface capturing required methods with doc comments referencing entity/component managers.
  2. No business logic implemented; default hook bodies (if any) should throw or no-op per spec clarity.
  3. README updated only if new setup notes required (otherwise untouched).

## Task 2: Test Intents for System Lifecycle
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint II (Stage 2)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/systems/__tests__/`
- **Guardrails**: same as Task 1 plus Implementation Guidelines Stage 2.
- **Objective**: Draft Jest spec with comment-only placeholders describing expectations for system lifecycle behavior.
- **Definition of Done**:
  1. Test file outlines required behaviors (mandatory override of `update`, optional hooks, invocation order expectations when integrated with players).
  2. No assertions yet; comments reference spec language for traceability.

## Task 3: Codify System Tests
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint II (Stage 3)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/systems/`
- **Guardrails**: Tasks 1 & 2 outputs, spec section "II. System".
- **Objective**: Implement Jest tests asserting behavior for subclasses of `System` interacting with mocked managers.
- **Definition of Done**:
  1. Tests verify that subclasses must implement `update`, hooks default to no-ops, and lifecycle order can be observed.
  2. Utilities/mocks added under `__tests__/helpers` as needed.
  3. Tests fail against unimplemented base class (ensuring coverage).

## Task 4: Implement System Base Class
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint II (Stage 4)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/systems/System.ts`
- **Guardrails**: Spec section "II. System"; tests from Task 3.
- **Objective**: Provide functional base class satisfying lifecycle behaviors.
- **Definition of Done**:
  1. `System` declares abstract `update` and concrete default `initialize`/`destroy` no-ops.
  2. Optional property/state support minimized per spec (stateless by default).
  3. Any helper types exported if required by tests (e.g., `SystemContext`).

## Task 5: Validate Checkpoint II
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint II (Stage 5)
- **Mindset**: Implementer
- **Workspace**: Project root & workspace
- **Guardrails**: Implementation Guidelines Stage 5; Bootstraps `checks.sh` usage.
- **Objective**: Run tests via workspace command and `./checks.sh`, update verification artifacts.
- **Definition of Done**:
  1. `npm run test` passes with new system tests.
  2. `./checks.sh` updated only if necessary (already points to workspace tests); run recorded with timestamped log in `verifications/`.
  3. Memory record documents completion and residual risks.

*Upon completing Task 5, re-engage Tasker mindset to plan Checkpoint III (Time) tasks.*
