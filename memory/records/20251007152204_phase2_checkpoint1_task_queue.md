# Phase 2 — Checkpoint I Task Queue

## Task 1: Workspace TypeScript Bootstrap
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint I (Setup)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_bootstraps.md` — Workspaces usage & directory discipline (lines ~60-110).
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Structure overview and Checkpoint I primitives (top of file through "ComponentManager").
  - `instruction_documents/Describing_Simulation_0_implementation_guidelines.md` — Test-driven staging requirements.
- **Objective**: Establish a TypeScript project scaffold to host Checkpoint I code and tests.
- **Definition of Done**:
  1. `package.json`, lockfile, and `tsconfig.json` committed under `workspaces/Describing_Simulation_0/`, with scripts for `build` and `test` (Jest + ts-jest or equivalent) and dependencies installed locally (no global assumptions).
  2. `jest.config.ts` (or `.js`) configured to discover tests within the workspace; TypeScript compiler options include strict type checking.
  3. Directory layout seeded with `src/core/entity/` and `src/core/components/`; empty placeholder files created where later checkpoints will expand (no business logic yet).
  4. Document any setup assumptions in `workspaces/Describing_Simulation_0/README.md` without duplicating instructions; reference `Describing_Simulation_0.md` as canonical source.
  5. `checks.sh` left untouched for this task but note in README that future checkpoints must wire project tests through it.

## Task 2: Skeletons for Checkpoint I Primitives
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint I (Stage 1)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Sections "I. Primitives" (Entity, ComponentType, EntityManager, ComponentManager).
  - `instruction_documents/Describing_Simulation_0_implementation_guidelines.md` — Stage 1 skeleton guidance.
- **Objective**: Create TypeScript skeletons with signatures and comments describing expected behaviors, without implementations.
- **Definition of Done**:
  1. `entity/Entity.ts` defines the entity representation (likely numeric identifier abstraction) with comments on usage.
  2. `entity/EntityManager.ts` exports a class with method stubs (`create`, `remove`, retrieval helpers) matching spec.
  3. `components/ComponentType.ts` introduces typing/contracts for component definitions.
  4. `components/ComponentManager.ts` declares methods for linking/unlinking components, retrieving by entity or type.
  5. All methods throw `new Error('Not implemented')` or similar, retaining empty logic for later stages; doc comments capture intent.

## Task 3: Test Intents for Checkpoint I Primitives
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint I (Stage 2)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/`
- **Guardrails**:
  - Same as Task 2 plus `instruction_documents/Describing_Simulation_0_implementation_guidelines.md` — Stage 2 guidance.
- **Objective**: Draft Jest spec files containing comment-only descriptions of the behaviors that must be verified for the primitives.
- **Definition of Done**:
  1. Test files (e.g., `src/core/entity/__tests__/EntityManager.test.ts`, `src/core/components/__tests__/ComponentManager.test.ts`) created with `describe`/`it` blocks containing TODO comments or comment-only placeholders enumerating expected behaviors (entity creation/removal, component linkage rules, etc.).
  2. Comments explicitly map to requirements from the spec (link back to component manager responsibilities).
  3. No executable assertions yet; test runner should effectively be skipped/no-op but files compile.
  4. README updated (if needed) to note current stage to guide future implementer.

## Task 4: Codify Tests for Checkpoint I
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint I (Stage 3)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/`
- **Guardrails**: Tasks 2 & 3 artifacts, spec sections for primitives, Implementation Guidelines Stage 3.
- **Objective**: Convert comment intents into executable Jest tests covering entity/component managers and type contracts.
- **Definition of Done**:
  1. Comment placeholders replaced with concrete test cases; ensure coverage for entity lifecycle, component lifecycle, uniqueness constraints, and retrieval operations.
  2. Any necessary test utilities or mocks created under a `testutils/` folder (documented if added).
  3. Tests compile with current skeletons (will fail due to unimplemented logic until Stage 4 completes).
  4. No production code logic filled beyond method signatures; maintain failing state pending implementation.

## Task 5: Implement Checkpoint I Logic
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint I (Stage 4)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/`
- **Guardrails**: Spec sections for Entity/Component managers, existing tests from Task 4.
- **Objective**: Fill method bodies to satisfy tests while adhering to ECS constraints (single component per type per entity, referential integrity on removal).
- **Definition of Done**:
  1. All primitives implement required data structures (maps/sets) with clear, commented invariants where non-trivial.
  2. Error handling or return contracts align with tests (e.g., duplicate entity behavior explicit).
  3. No unrelated files modified; plugin directories untouched.
  4. Implementation keeps state encapsulated within managers; no direct exports of raw collections unless spec requires.

## Task 6: Validate Checkpoint I
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint I (Stage 5)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/`
- **Guardrails**: Implementation Guidelines Stage 5, Bootstraps checks guidance.
- **Objective**: Ensure automated tests execute cleanly and wire them into the repository verification flow.
- **Definition of Done**:
  1. Tests from Task 4 pass locally (`npm test` or equivalent) with implemented logic.
  2. `checks.sh` updated to invoke workspace test command (e.g., `npm --prefix workspaces/Describing_Simulation_0 test`) and verified via a sample run.
  3. Create verification artifact under `verifications/` with timestamped filename capturing the check output summary.
  4. Record results and residual risks in a new memory record upon completion.

*Upon completion of Task 6, transition back to the Tasker mindset to scope Checkpoint II (System) work.*
