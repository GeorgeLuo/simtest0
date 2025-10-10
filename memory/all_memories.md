<!-- Source: records/20251007150441_bootstrap_task_queue.md -->
# Phase 1 Bootstrapping — Task Queue

## Task 1: Instruction Documents Extraction
- **Lifecycle**: Phase 1 Bootstrapping — Checkpoint 1
- **Mindset**: Implementer
- **Workspace**: `instruction_documents/` (new), `instruction_documents/mindset_prompts/`
- **Guardrails**: `Describing_Simulation_0.md` — Bootstraps section (lines ~552–615), Agent Prompts subsections, Codifying Simulations header.
- **Objective**: Create the `instruction_documents/` tree, relocate each required section from `Describing_Simulation_0.md` into its dedicated markdown file (preserve header levels), copy the full original document into the directory, and draft `..._table_of_contents.md` capturing the header hierarchy of the source document.
- **Definition of Done**:
  1. All files enumerated in Bootstraps exist with correct names (`*_theory.md`, `*_bootstraps.md`, `*_master_prompt.md`, `*_codifying_simulations.md`, `*_implementation_guidelines.md`, `*_schedule_of_work.md`, and mindset prompts under `mindset_prompts/`).
  2. `instruction_documents/<original filename>.md` contains an unchanged copy of `Describing_Simulation_0.md`.
  3. `instruction_documents/<original filename>_table_of_contents.md` lists the headers with indentation reflecting hierarchy.
  4. Original `Describing_Simulation_0.md` remains at repo root as source of truth.

## Task 2: Indexes & Agent Signposting
- **Lifecycle**: Phase 1 Bootstrapping — Checkpoint 2
- **Mindset**: Implementer
- **Workspace**: `instruction_documents/index.md`, `instruction_documents/mindset_prompts/index.md`, repo root `AGENTS.md`
- **Guardrails**: `Describing_Simulation_0.md` — Bootstraps instructions on discoverability and index creation; Agent Prompts → Tasker notes on signposting.
- **Objective**: Surface navigational aids for instruction documents and make the agent handoff explicit.
- **Definition of Done**:
  1. `instruction_documents/index.md` maps every file in the directory to a short description and points readers to review the table of contents file before deep dives.
  2. `instruction_documents/mindset_prompts/index.md` enumerates the prompts with brief summaries.
  3. `AGENTS.md` exists at repo root with a high-visibility note directing contributors to the instruction documents index and mindset prompt index before changing tasks.
  4. All new docs include contextual links back to `Describing_Simulation_0.md` filename so future updates can locate the source.

## Task 3: Repository Scaffolding Utilities
- **Lifecycle**: Phase 1 Bootstrapping — Checkpoint 3
- **Mindset**: Implementer
- **Workspace**: `checks.sh`, `tools/index.md`, `tools/run_integration.sh`, `workspaces/Describing_Simulation_0/`, `verifications/`, `memory/`
- **Guardrails**: `Describing_Simulation_0.md` — Bootstraps (filesystem layout), Agent Prompts → Tasker directives on memory usage, Checks subsection.
- **Objective**: Bring the supporting directories and stubs online so later phases have standard entry points.
- **Definition of Done**:
  1. `tools/` directory contains an overview (`index.md`) describing intended scripts and a stub `run_integration.sh` with executable bit set and placeholder instructions referencing future integration tests.
  2. `checks.sh` exists at repo root, executable, and currently forwards to a TODO comment indicating future test suite wiring while touching no external deps.
  3. `workspaces/Describing_Simulation_0/` directory exists (empty scaffold acceptable) with a README or note describing its purpose for Phase 2 artifacts.
  4. `verifications/` directory exists with a README documenting expected verification artifacts naming convention.
  5. `memory/ways/` and `memory/records/` confirmed present; this task entry updated with a note when complete to keep the task queue current.

<!-- Source: records/20251007150905_instruction_documents_extracted.md -->
# Task Record — Phase 1 Bootstrapping Checkpoint 1

## Summary
- Created `instruction_documents/` with `mindset_prompts/` scaffold per Bootstraps guidance.
- Parsed `Describing_Simulation_0.md` into dedicated section files: theory, codifying simulations, bootstraps, implementation guidelines, schedule of work, master prompt, and mindset prompts.
- Copied the full source document into `instruction_documents/Describing_Simulation_0.md`.
- Generated `Describing_Simulation_0_table_of_contents.md` capturing heading hierarchy (H1–H4) for quick navigation.

## Validation
- Confirmed each extracted file retains original heading levels and trailing newline formatting.
- Verified mindset prompt files reside under `instruction_documents/mindset_prompts/` with correct naming convention.

## Status
- Checkpoint 1 complete; tasks 2 and 3 from `20251007150441_bootstrap_task_queue.md` remain open for Implementer pickup.

<!-- Source: records/20251007151112_indexes_signposting.md -->
# Task Record — Phase 1 Bootstrapping Checkpoint 2

## Summary
- Authored `instruction_documents/index.md` consolidating extracted files with concise summaries and a pointer to the table of contents.
- Created `instruction_documents/mindset_prompts/index.md` to describe each mindset prompt and indicate the parent reference.
- Introduced `AGENTS.md` at repository root to direct contributors to both indexes before beginning work and to keep edits within the extracted instruction set.

## Validation
- Each new document references `Describing_Simulation_0.md` as the source of truth, fulfilling Bootstraps discoverability requirements.
- Confirmed indexes enumerate all relevant files currently present in their directories.

## Status
- Checkpoint 2 complete; proceed to Checkpoint 3 (Repository Scaffolding Utilities) from the task queue.

<!-- Source: records/20251007151747_repository_scaffold.md -->
# Task Record — Phase 1 Bootstrapping Checkpoint 3

## Summary
- Added `tools/index.md` documenting current utility scripts and upstream reference.
- Stubbed `tools/run_integration.sh` with executable placeholder messaging and `checks.sh` with TODO marker; both reference the bootstrapping instructions.
- Established `workspaces/Describing_Simulation_0/README.md` to reserve the artifact workspace for Phase 2.
- Documented verification artifact expectations in `verifications/README.md`.
- Confirmed `memory/records/` and `memory/ways/` remain available for future logging.

## Validation
- Verified new scripts are executable (`chmod +x`).
- Directory listings match the structure defined in `instruction_documents/Describing_Simulation_0_bootstraps.md`.

## Status
- Phase 1 bootstrapping tasks (Checkpoints 1-3) complete. Ready to transition to Phase 2 task generation under the Tasker mindset.

<!-- Source: records/20251007152204_phase2_checkpoint1_task_queue.md -->
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

<!-- Source: records/20251007152534_checkpoint1_task1_workspace_setup.md -->
# Task Record — Phase 2 Checkpoint I Task 1

## Summary
- Bootstrapped Node.js/TypeScript project under `workspaces/Describing_Simulation_0/` with strict compiler settings (`tsconfig.json`) and Jest via `ts-jest` (`jest.config.js`).
- Added project scripts in `package.json` for `build`, `test`, `test:watch`, and `clean`; installed dev dependencies (`typescript`, `ts-node`, `jest`, `ts-jest`, `@types/*`).
- Seeded directory structure with `src/core/entity/` and `src/core/components/` placeholder files awaiting Stage 1 skeleton implementation.
- Enhanced workspace README to document environment setup, reference instruction documents, and note upcoming wiring of `checks.sh`.

## Validation
- `npm run build` and `npm run test` executed successfully (no tests yet, allowed via Jest config `passWithNoTests`).
- Confirmed `package-lock.json` generated and retained in workspace.

## Status
- Task 1 complete. Proceed to Task 2 (Checkpoint I Stage 1 skeletons) as the next Implementer action.

<!-- Source: records/20251007152957_checkpoint1_task2_skeletons.md -->
# Task Record — Phase 2 Checkpoint I Task 2

## Summary
- Replaced placeholder exports with typed skeletons for primitives under `src/core/`.
  - `entity/Entity.ts` now defines `Entity` aliases and an id factory helper.
  - `entity/EntityManager.ts` exposes lifecycle method stubs (`create`, `remove`, `has`, `list`).
  - `components/ComponentType.ts` models component type contracts and instance shape.
  - `components/ComponentManager.ts` outlines manager responsibilities with method signatures and doc comments.
- All methods currently throw `Error('Not implemented')` to enforce later Stage 4 implementations.

## Validation
- `npm run build` succeeds, confirming TypeScript skeletons compile.
- File structure matches the Codifying Simulations checkpoint layout.

## Status
- Task 2 complete; continue with Task 3 (comment-only test intents for primitives).

<!-- Source: records/20251007154220_checkpoint1_task3_test_intents.md -->
# Task Record — Phase 2 Checkpoint I Task 3

## Summary
- Added comment-oriented Jest specs capturing expectations for primitives:
  - `src/core/entity/__tests__/EntityManager.test.ts` outlines lifecycle intents (id uniqueness, removal semantics, list/has behaviors).
  - `src/core/components/__tests__/ComponentManager.test.ts` details component association rules and interactions with entity lifecycle.
- Each test file instantiates managers but defers assertions to Stage 3, embedding TODO notes.

## Validation
- `npm run test` executes both suites successfully (no assertions yet), confirming the scaffold compiles.

## Status
- Task 3 complete; Task 4 will convert these intents into executable tests.

<!-- Source: records/20251007154356_checkpoint1_task4_tests.md -->
# Task Record — Phase 2 Checkpoint I Task 4

## Summary
- Converted test intents into executable Jest suites:
  - `src/core/entity/__tests__/EntityManager.test.ts` now asserts unique id allocation, lifecycle transitions, remove semantics, and list consistency.
  - `src/core/components/__tests__/ComponentManager.test.ts` covers component add/replace/remove behaviors, retrieval helpers, and entity association queries.
- Introduced small helpers for manager setup and mock component types to streamline assertions.

## Validation
- `npm run test` executed with expected failures (EntityManager/ComponentManager methods throw `Not implemented`), confirming tests exercise unimplemented paths.

## Status
- Task 4 complete. Proceed to Task 5 to implement primitives satisfying these tests.

<!-- Source: records/20251007154730_checkpoint1_task5_and_6.md -->
# Task Record — Phase 2 Checkpoint I Tasks 5 & 6

## Summary
- Implemented EntityManager primitives:
  - Incremental id allocation with internal Set tracking (`create`, `remove`, `has`, `list`).
- Implemented ComponentManager storage:
  - Bidirectional maps to enforce one component per type and support retrieval helpers.
  - Payload validation via ComponentType.validate and cleanup of reverse indexes.
- Updated repository verifier (`checks.sh`) to execute workspace Jest suite.

## Validation
- `npm run test` and `./checks.sh` both pass (11 tests total).
- Verification artifact written to `verifications/20251007T154720_checks.log` noting the successful run.

## Status
- Phase 2 Checkpoint I complete. Transition back to Tasker mindset to outline Checkpoint II (System) tasks.

<!-- Source: records/20251007154911_phase2_checkpoint2_task_queue.md -->
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

<!-- Source: records/20251007155054_checkpoint2_task1_system_skeleton.md -->
# Task Record — Phase 2 Checkpoint II Task 1

## Summary
- Added `src/core/systems/System.ts` defining `SystemContext` (entity + component managers) and abstract `System` base class.
- Lifecycle hooks `initialize`/`destroy` currently throw `Not implemented` per Stage 1 skeleton expectations; `update` declared abstract.
- `npm run build` passes, confirming the new skeleton integrates with existing TypeScript setup.

## Status
- Task 1 complete. Proceed with Task 2 to draft system lifecycle test intents.

<!-- Source: records/20251007155249_checkpoint2_task2_test_intents.md -->
# Task Record — Phase 2 Checkpoint II Task 2

## Summary
- Created `src/core/systems/__tests__/System.test.ts` with comment-only placeholders describing lifecycle expectations (abstract `update`, optional hooks, lifecycle order, context usage).
- Maintained TODOs for Stage 3 conversion to executable assertions.

## Validation
- `npm run test` continues to pass (Suite count includes placeholder test).

## Status
- Task 2 complete; move to Task 3 to implement concrete system lifecycle tests.

<!-- Source: records/20251007155417_checkpoint2_task3_system_tests.md -->
# Task Record — Phase 2 Checkpoint II Task 3

## Summary
- Replaced placeholder lifecycle spec with executable assertions in `src/core/systems/__tests__/System.test.ts`.
  - Validates hook invocation order using a concrete subclass.
  - Ensures initialize/destroy default to no-ops for subclasses that only override `update`.
- Tests currently fail (as expected) because `System.initialize`/`destroy` throw `Not implemented` pending Stage 4 implementation.

## Validation
- `npm run test` fails with the intended error, confirming coverage reaches unimplemented hooks.

## Status
- Task 3 complete; proceed with Task 4 to implement `System` hooks and satisfy tests.

<!-- Source: records/20251007155551_checkpoint2_task4_and_5_system.md -->
# Task Record — Phase 2 Checkpoint II Tasks 4 & 5

## Summary
- Updated `src/core/systems/System.ts` so `initialize` and `destroy` default to no-ops while `update` remains abstract.
- System lifecycle tests now pass, verifying hook order and default behavior.
- Re-ran `npm run test` and `./checks.sh`; appended results to `verifications/20251007T154720_checks.log`.

## Validation
- Jest suites (13 tests) all green.
- Repository checks succeed with updated log entry at `verifications/20251007T154720_checks.log`.

## Status
- Phase 2 Checkpoint II complete. Hand off to Tasker mindset to queue Checkpoint III (Time) work.

<!-- Source: records/20251007155705_phase2_checkpoint3_task_queue.md -->
# Phase 2 — Checkpoint III (Time) Task Queue

## Task 1: Time Component and System Skeletons
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint III (Stage 1)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/components/TimeComponent.ts`, `src/core/systems/TimeSystem.ts`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Section "III. Time".
  - Implementation Guidelines Stage 1 (skeleton creation).
- **Objective**: Create placeholder files for `TimeComponent` and `TimeSystem` with signatures only.
- **Definition of Done**:
  1. `TimeComponent.ts` exports contract/interface describing tick counter payload.
  2. `TimeSystem.ts` extends base `System`, stubbing `initialize`/`update` with `Not implemented` errors.
  3. No logic yet; comments reference spec assumptions (integer tick increments).

## Task 2: Test Intents for Time Component/System
- **Lifecycle**: Stage 2
- **Workspace**: `src/core/components/__tests__/TimeComponent.test.ts`, `src/core/systems/__tests__/TimeSystem.test.ts`
- **Objective**: Author comment-only Jest tests listing behaviors (component validation, system creation of entity, tick increments).
- **Definition of Done**: Comments map to spec requirements; tests compile but have no assertions.

## Task 3: Codify Time Tests
- **Lifecycle**: Stage 3
- **Objective**: Implement Jest assertions for component validation and system behavior with mocked managers.
- **Definition of Done**:
  1. Tests cover `TimeComponent` schema validation and `TimeSystem` lifecycle (creating entity, calling component manager to increment).
  2. Add helper fakes/mocks as necessary under `__tests__/helpers`.
  3. Tests fail with current skeleton implementations.

## Task 4: Implement Time Component and System Logic
- **Lifecycle**: Stage 4
- **Objective**: Fill in `TimeComponent` contract and `TimeSystem` logic to satisfy tests.
- **Definition of Done**:
  1. `TimeComponent` exposes `ComponentType` definition ensuring integer payload.
  2. `TimeSystem` on initialize creates entity with time component, on update increments tick.
  3. Interactions rely on existing managers.

## Task 5: Validate Checkpoint III
- **Lifecycle**: Stage 5
- **Objective**: Run `npm run test` and `./checks.sh`; append verification log and record memory entry.
- **Definition of Done**:
  1. All suites pass.
  2. Verification log appended with timestamp.
  3. Memory record summarizing work, noting readiness for Checkpoint IV (Orchestration).

*After Task 5, return to Tasker mindset for Checkpoint IV planning.*

<!-- Source: records/20251007155927_checkpoint3_task1_time_skeletons.md -->
# Task Record — Phase 2 Checkpoint III Task 1

## Summary
- Added skeleton files for time primitives:
  - `src/core/components/TimeComponent.ts` defines `TimePayload` interface and `TimeComponent` placeholder validator.
  - `src/core/systems/TimeSystem.ts` extends `System` with `initialize`/`update` throwing `Not implemented`.
- Build (`npm run build`) succeeds, confirming TypeScript integration.

## Status
- Task 1 complete. Next steps: Stage 2 comment-only tests for Time component/system.

<!-- Source: records/20251007160039_checkpoint3_task2_time_test_intents.md -->
# Task Record — Phase 2 Checkpoint III Task 2

## Summary
- Authored comment-only Jest specs for time primitives:
  - `src/core/components/__tests__/TimeComponent.test.ts` outlines validation expectations for tick payloads.
  - `src/core/systems/__tests__/TimeSystem.test.ts` captures initialization/increment behaviors using managers.
- Tests reference spec goals and defer implementation to Stage 3.

## Validation
- `npm run test` remains green (placeholders compile successfully).

## Status
- Task 2 complete; proceed to Stage 3 to codify the time tests.

<!-- Source: records/20251007160236_checkpoint3_task3_time_tests.md -->
# Task Record — Phase 2 Checkpoint III Task 3

## Summary
- Converted time component/system test intents into executable Jest suites.
  - `TimeComponent.test.ts` now verifies validation of integer ticks and metadata stability.
  - `TimeSystem.test.ts` introduces mocks for entity/component managers to assert initialization and tick increments.
- Tests currently fail due to `Not implemented` placeholders in `TimeComponent` and `TimeSystem`, preparing for Stage 4 implementation.

## Validation
- `npm run test` fails with expected `Not implemented` errors, confirming coverage reaches the skeleton methods.

## Status
- Task 3 complete; proceed to Task 4 to implement time component/system logic.

<!-- Source: records/20251007160532_checkpoint3_task4_and_5_time.md -->
# Task Record — Phase 2 Checkpoint III Tasks 4 & 5

## Summary
- Implemented `TimeComponent.validate` to accept non-negative integer ticks and reject invalid payloads.
- Implemented `TimeSystem` to create a dedicated time entity on initialization and increment the tick component each update, falling back to initialization if update is invoked first.
- All time-related Jest suites now pass (18 tests overall), and repository checks (`./checks.sh`) remain green.
- Appended verification log entry at `verifications/20251007T154720_checks.log`.

## Status
- Phase 2 Checkpoint III complete. Ready for Tasker to scope Checkpoint IV (Orchestration).

<!-- Source: records/20251007160637_phase2_checkpoint4_task_queue.md -->
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

<!-- Source: records/20251007160821_checkpoint4_task1_system_manager_skeleton.md -->
# Task Record — Phase 2 Checkpoint IV Task 1

## Summary
- Added `src/core/systems/SystemManager.ts` skeleton defining constructor, `addSystem`, `removeSystem`, `runCycle`, `getSystems`, and `getContext` stubs with `Not implemented` placeholders.
- Build succeeds with new file integrated.

## Status
- Task 1 complete. Next: Stage 2 comment-only tests for SystemManager.

<!-- Source: records/20251007160953_checkpoint4_task2_system_manager_intents.md -->
# Task Record — Phase 2 Checkpoint IV Task 2

## Summary
- Added comment-only spec `src/core/systems/__tests__/SystemManager.test.ts` capturing expectations for system registration, lifecycle hooks, execution order, and context exposure.
- Tests compile without assertions, awaiting Stage 3 conversion.

## Validation
- `npm run test` remains green with placeholder test suite.

## Status
- Task 2 complete; next step is to codify the orchestration tests in Stage 3.

<!-- Source: records/20251007161113_checkpoint4_task3_system_manager_tests.md -->
# Task Record — Phase 2 Checkpoint IV Task 3

## Summary
- Replaced placeholder SystemManager spec with executable Jest tests verifying registration order, lifecycle hooks, indexed insertion, update execution, removal semantics, and context exposure (`src/core/systems/__tests__/SystemManager.test.ts`).
- Tests currently fail due to `Not implemented` stubs in `SystemManager`, setting up Stage 4 implementation.

## Validation
- `npm run test` fails with expected `Not implemented` errors from SystemManager methods.

## Status
- Task 3 complete; proceed to Task 4 to implement SystemManager logic.

<!-- Source: records/20251007161324_checkpoint4_task4_and_5_system_manager.md -->
# Task Record — Phase 2 Checkpoint IV Tasks 4 & 5

## Summary
- Implemented `SystemManager` orchestration:
  - Maintains ordered system list with optional insertion index.
  - Stores shared `SystemContext` for all lifecycle calls.
  - `addSystem` triggers `initialize`, `removeSystem` triggers `destroy`, and `runCycle` iterates systems invoking `update`.
  - `getSystems` returns a copy of current order; `getContext` exposes the stored context.
- Adjusted SystemManager tests to assert update invocation without relying on array index order details and to compare contexts via `toStrictEqual`.
- All Jest suites now pass (23 tests) and repository checks remain green with log entry `20251007T161236 - checks.sh pass (SystemManager)`.

## Status
- Phase 2 Checkpoint IV complete. Ready for Tasker to scope Checkpoint V (Messaging).

<!-- Source: records/20251007161417_phase2_checkpoint5_task_queue.md -->
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

<!-- Source: records/20251007161736_checkpoint5_task1_messaging_skeletons.md -->
# Task Record — Phase 2 Checkpoint V Task 1

## Summary
- Established messaging scaffolding under `src/core/messaging/`:
  - `Bus.ts` with subscribe/publish stubs.
  - `outbound/Frame.ts`, `FrameFilter.ts`, `Acknowledgement.ts` definitions.
  - `inbound/Operation.ts`, `MessageHandler.ts`, and `InboundHandlerRegistry.ts` skeletons referencing `SystemContext`.
- Corrected import paths to `../../systems/System` in inbound files.
- `npm run build` succeeds after skeleton additions.

## Status
- Task 1 complete. Next: Stage 2 comment-only tests for messaging components.

<!-- Source: records/20251007162034_checkpoint5_task2_messaging_test_intents.md -->
# Task Record — Phase 2 Checkpoint V Task 2

## Summary
- Added comment-only Jest specs capturing messaging expectations:
  - `Bus.test.ts`, `FrameFilter.test.ts`, `Acknowledgement.test.ts` for outbound behaviors.
  - `Operation.test.ts`, `MessageHandler.test.ts`, `InboundHandlerRegistry.test.ts` for inbound behaviors.
- Tests reference spec goals and defer assertions to Stage 3.

## Validation
- `npm run test` continues to pass with placeholder suites.

## Status
- Task 2 complete; proceed to Stage 3 to implement messaging tests.

<!-- Source: records/20251007162716_checkpoint5_task3_messaging_tests.md -->
# Task Record — Phase 2 Checkpoint V Task 3

## Summary
- Converted messaging test intents into executable Jest suites:
  - `Bus.test.ts` validates subscription order and unsubscribe behavior.
  - `FrameFilter.test.ts` ensures blacklisted components are removed without mutating original frame.
  - `Acknowledgement.test.ts` documents success/error shapes.
  - `Operation.test.ts` confirms execute contract.
  - `MessageHandler.test.ts` asserts sequential operation execution with shared context.
  - `InboundHandlerRegistry.test.ts` verifies handler routing and unknown type handling.
- Tests currently fail due to Not implemented messaging skeleton methods, preparing for Stage 4.

## Validation
- `npm run test` fails with expected `Not implemented` errors from Bus, FrameFilter, MessageHandler, and InboundHandlerRegistry.

## Status
- Task 3 complete; proceed to Task 4 to implement messaging components.

<!-- Source: records/20251007163003_checkpoint5_task4_and_5_messaging.md -->
# Task Record — Phase 2 Checkpoint V Tasks 4 & 5

## Summary
- Implemented messaging primitives:
  - `Bus` maintains subscriber set with unsubscribe support.
  - `FrameFilter` removes blacklisted components without mutating originals.
  - `MessageHandler` sequences operations.
  - `InboundHandlerRegistry` registers/dispatches handlers and no-ops unknown types.
- Jest suites (31 tests) all pass after implementation; repository checks (`./checks.sh`) succeed.
- Logged verification stamp `20251007T162123 - checks.sh pass (Messaging)`.

## Status
- Phase 2 Checkpoint V complete. Ready for Tasker to plan Checkpoint VI (IO Player).

<!-- Source: records/20251007163113_phase2_checkpoint6_task_queue.md -->
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

<!-- Source: records/20251007163608_checkpoint6_task1_io_player_skeletons.md -->
# Task Record — Phase 2 Checkpoint VI Task 1

## Summary
- Created IO Player scaffolding:
  - `src/core/simplayer/IOPlayer.ts` with constructor and lifecycle stubs (`start`, `pause`, `stop`, inbound handling, frame publishing).
  - Operation skeletons under `src/core/simplayer/operations/` for start, pause, stop, inject, and eject behaviors.
- Build (`npm run build`) succeeds, confirming TypeScript integration.

## Status
- Task 1 complete. Proceed to Stage 2 to draft IO Player test intents.

<!-- Source: records/20251007164247_checkpoint6_task2_io_test_intents.md -->
# Task Record — Phase 2 Checkpoint VI Task 2

## Summary
- Added comment-only Jest specs for IO player lifecycle and operations:
  - `src/core/simplayer/__tests__/IOPlayer.test.ts` covers start/pause/stop, inbound routing, and frame publishing expectations.
  - Operation test placeholders created for Start/Pause/Stop/Inject/Eject behaviors under `src/core/simplayer/operations/__tests__/`.

## Validation
- `npm run test` passes with placeholder suites.

## Status
- Task 2 complete; proceed to Stage 3 to codify IO Player tests.

<!-- Source: records/20251007165013_checkpoint6_task3_io_tests.md -->
# Task Record — Phase 2 Checkpoint VI Task 3

## Summary
- Replaced IO player placeholders with executable Jest tests:
  - `IOPlayer.test.ts` now verifies lifecycle delegation to `SystemManager`, frame filtering prior to outbound publication, and routing through the inbound handler registry.
  - Operation tests ensure `Start/Pause/Stop` invoke player lifecycle methods and return success acknowledgements with message ids.
  - Inject/Eject system operation tests validate delegation to player injection/ejection hooks returning acknowledgements.
- Tests currently fail due to Not implemented stubs in IOPlayer/operations, setting up Stage 4 implementation work.

## Validation
- `npm run test` fails with `Not implemented` errors from Start/Pause/Eject operations as expected.

## Status
- Task 3 complete; proceed to Task 4 to implement IOPlayer and operations.

<!-- Source: records/20251007165648_checkpoint6_task4_and_5_io_player.md -->
# Task Record — Phase 2 Checkpoint VI Tasks 4 & 5

## Summary
- Implemented IO Player lifecycle and messaging integration:
  - Manages inbound subscription, periodic system manager cycles, pause/stop handling, and frame publication via `FrameFilter` and outbound bus.
  - Added injection/ejection hooks delegating to `SystemManager`.
- Implemented start/pause/stop/inject/eject operation classes returning acknowledgements and delegating to the player hooks.
- Expanded messaging generics to support arbitrary contexts for operations/handlers.
- All Jest suites now green (36 tests) and `./checks.sh` logs `20251007T165356 - checks.sh pass (IO Player)`.

## Status
- Phase 2 Checkpoint VI complete. Tasker should scope Checkpoint VII (Routes/Server).

<!-- Source: records/20251007165734_phase2_checkpoint7_task_queue.md -->
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

<!-- Source: records/20251007170023_checkpoint7_task1_server_skeletons.md -->
# Task Record — Phase 2 Checkpoint VII Task 1

## Summary
- Added server and routing scaffolds under `src/core/`:
  - `routes/router.ts`, `routes/simulation.ts`, `routes/evaluation.ts`, `routes/codebase.ts` exporting placeholder APIs.
  - `server/index.ts` defining `Server` skeleton with async lifecycle stubs.
- TypeScript build remains green (`npm run build`).

## Status
- Task 1 complete. Next: Stage 2 comment-only tests for server/routes.

<!-- Source: records/20251007170736_checkpoint7_task2_server_test_intents.md -->
# Task Record — Phase 2 Checkpoint VII Task 2

## Summary
- Added comment-only Jest specs for server and route scaffolding:
  - `routes/__tests__/router.test.ts`, `simulation.test.ts`, `evaluation.test.ts`, `codebase.test.ts` describe intended behaviors (dispatch, simulation controls, evaluation injections, codebase listing).
  - `server/__tests__/index.test.ts` captures expectations for server start/stop lifecycle.
- Tests remain placeholders pending Stage 3 implementation.

## Validation
- `npm run test` passes with new placeholder suites.

## Status
- Task 2 complete; Stage 3 will codify server/route tests.

<!-- Source: records/20251007172142_checkpoint7_task4_and_5_server.md -->
# Task Record — Phase 2 Checkpoint VII Tasks 4 & 5

## Summary
- Implemented routing and server behaviors:
  - `Router` now stores handlers, normalizes base paths, and dispatches requests.
  - Simulation routes expose start/pause/stop/inject/eject and SSE stream endpoints, returning success acknowledgements.
  - Evaluation routes support frame injection and system control, returning acknowledgements and streaming events.
  - Codebase routes proxy to dependency-provided directory and file readers.
  - `Server` wraps Node http server, dispatching to the router and handling 404 responses.
- Added concrete Jest tests for router, routes, and server; all 42 tests pass.
- Verification log updated (`20251007T170406 - checks.sh pass (Server & Routes)`).

## Status
- Checkpoint VII complete. Tasker to scope Checkpoint VIII (Evaluation Player).

<!-- Source: records/20251007175910_phase2_checkpoint8_task_queue.md -->
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

<!-- Source: records/20251007180246_checkpoint8_task1_eval_skeletons.md -->
# Task Record — Phase 2 Checkpoint VIII Task 1

## Summary
- Created evaluation player scaffolding:
  - `src/core/evalplayer/EvaluationPlayer.ts` extends IOPlayer with placeholder `injectFrame` method.
  - Operation skeletons added (`InjectFrameOperation.ts`, `RegisterConditionOperation.ts`, `RemoveConditionOperation.ts`) returning Not implemented.
- Build (`npm run build`) passes.

## Status
- Task 1 complete; Stage 2 test intents next.

<!-- Source: records/20251007180403_checkpoint8_task2_eval_test_intents.md -->
# Task Record — Phase 2 Checkpoint VIII Task 2

## Summary
- Added placeholder Jest specs for evaluation player and operations under `src/core/evalplayer/**/__tests__` capturing frame injection, condition registration, and outbound expectations.
- Tests remain comment-only; implementation deferred to Stage 3.

## Validation
- `npm run test` remains green with new placeholders.

## Status
- Task 2 complete. Stage 3 will codify evaluation tests.

<!-- Source: records/20251007180731_checkpoint8_task3_tests_and_task4_implementation.md -->
# Task Record — Phase 2 Checkpoint VIII Tasks 3 & 4

## Summary
- Converted evaluation player placeholders into executable tests covering frame injection storage, condition management, and outbound publishing (`src/core/evalplayer/__tests__/EvaluationPlayer.test.ts`).
- Added operation tests ensuring acknowledgements and delegation to player hooks (`InjectFrameOperation.test.ts`, `RegisterConditionOperation.test.ts`, `RemoveConditionOperation.test.ts`).
- Implemented evaluation player logic:
  - `EvaluationPlayer` now tracks frames and conditions, uses inherited `publishFrame` to emit filtered frames.
  - Operations return success acknowledgements and call corresponding player methods.
- All Jest suites (47 tests) pass.

## Status
- Ready for Stage 5 validation (checks.sh) and subsequent task planning.

<!-- Source: records/20251007180820_checkpoint8_task5_validation.md -->
# Task Record — Phase 2 Checkpoint VIII Task 5

## Summary
- Ran workspace test suite (`npm run test`) and repo checks (`./checks.sh`); all 47 tests pass.
- Verification log appended with `20251007T180812 - checks.sh pass (Evaluation Player)`.

## Status
- Phase 2 Checkpoint VIII complete. Tasker to scope Checkpoint IX (Sim-Eval Server integration).

<!-- Source: records/20251007181524_phase2_checkpoint9_task_queue.md -->
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

<!-- Source: records/20251007182845_checkpoint9_task2_integration_test_intent.md -->
# Task Record — Phase 2 Checkpoint IX Task 2

## Summary
- Added placeholder integration test at `src/integration/__tests__/SimEvalIntegration.test.ts` outlining the planned end-to-end flow (installation, server start, system injection, simulation start, SSE monitoring, validation, stop).
- Test currently contains comments only, to be codified in Stage 3.

## Validation
- `npm run test` remains green (48 tests).

## Status
- Task 2 complete; Stage 3 will implement the integration test logic.

<!-- Source: records/20251007183813_checkpoint9_task3_and_4_integration_implementation.md -->
# Task Record — Phase 2 Checkpoint IX Tasks 3 & 4

## Summary
- Converted integration outline into executable Jest test (`src/integration/__tests__/SimEvalIntegration.test.ts`) mocking players/buses and verifying `createServer` registers routes and returns a server instance.
- Implemented `createServer` in `src/server/bootstrap.ts` to assemble router with simulation/evaluation/codebase routes and instantiate the HTTP server wrapper.
- Updated simulation/evaluation routes to publish acknowledgements, stream SSE, and delegate to IO/Evaluation player hooks with concrete types.
- Codebase routes now proxy to dependency-provided `listDir`/`readFile` functions.
- All tests (48) pass after updates.

## Status
- Proceed to Stage 5 validation (`./checks.sh`) and planning for next checkpoint.

<!-- Source: records/20251007184630_phase2_checkpoint9_stage5_and_phase3_task_queue.md -->
# Phase 2 Checkpoint IX Stage 5 & Phase 3 Task Queue

## Task 5: Validate Checkpoint IX Outcomes
- **Lifecycle**: Phase 2 Artifact Creation — Checkpoint IX Stage 5 (Validation)
- **Mindset**: Integrator
- **Workspace**: `workspaces/Describing_Simulation_0`, `./checks.sh`, `verifications/20251007T154720_checks.log`, `memory/records/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_implementation_guidelines.md` (Stage 5 validation loop)
  - `instruction_documents/Describing_Simulation_0_bootstraps.md` (verification logging expectations)
  - `tools/index.md` & `tools/run_integration.sh` for integration tooling context
- **Objective**: Execute the full validation sweep across unit and integration layers, recording evidence of a green state ahead of Phase 3.
- **Definition of Done**:
  1. `npm --prefix workspaces/Describing_Simulation_0 test` and `./checks.sh` both succeed, with results captured in the session transcript.
  2. Append a new timestamped entry noting the run and scope to `verifications/20251007T154720_checks.log`.
  3. Draft a Stage 5 completion record in `memory/records/` summarizing validation findings and readiness to enter Phase 3.

## Phase 3 Task 1: Build & Start Service
- **Lifecycle**: Phase 3 Integration Test — Step 1 (Build & Start Service)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/server`, `workspaces/Describing_Simulation_0/src/main.ts` (new), `workspaces/Describing_Simulation_0/package.json`, associated tests under `workspaces/Describing_Simulation_0/src/**/__tests__/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (Integration → Build & Start Service)
  - `instruction_documents/Describing_Simulation_0_implementation_guidelines.md` (Stage choreography)
- **Objective**: Provide a runnable entrypoint that wires default sim/eval players through `createServer`, exposes a CLI start command, and surfaces the listening address.
- **Definition of Done**:
  1. Introduce `src/main.ts` exporting a `start()` helper that constructs real players (SystemManager, Bus, FrameFilter, handler registries) and starts the HTTP server with configurable port (CLI + env support).
  2. Update `package.json` (and documentation if needed) with `npm run start` that compiles (if necessary) and launches the server, logging host/port when ready.
  3. Cover the entrypoint with Jest (e.g., using spies/mocks on `Server.start`) ensuring the wiring contract matches expectations.

## Phase 3 Task 2: Surface API Usage
- **Lifecycle**: Phase 3 Integration Test — Step 2 (Learn Usage)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/routes`, potential `workspaces/Describing_Simulation_0/src/routes/information`, `workspaces/Describing_Simulation_0/src/routes/router.ts`, informational markdown under `workspaces/Describing_Simulation_0/src/routes/information/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (Router + Integration Learn Usage step)
  - `instruction_documents/Describing_Simulation_0_table_of_contents.md` for documentation linkage
- **Objective**: Ensure a first-time user can probe `/` and discover simulation, evaluation, and codebase API segments along with documentation links.
- **Definition of Done**:
  1. Register a root (and supporting informational) route that responds with discoverable metadata and pointers to markdown docs, loading content from version-controlled files.
  2. Add or update Jest coverage asserting the root response structure and that documentation files resolve correctly.
  3. Update any relevant docs (`tools/index.md`, workspace README) to reflect the discoverability surface.

## Phase 3 Task 3: Automate Injection Workflow
- **Lifecycle**: Phase 3 Integration Test — Steps 3 & 4 (Validate Idle State, Inject Systems/Components)
- **Mindset**: Implementer
- **Workspace**: `tools/run_integration.sh`, potential helper scripts under `tools/`, plugin staging directories (e.g., `workspaces/Describing_Simulation_0/plugins/**`), HTTP client utilities under `workspaces/Describing_Simulation_0/src/integration/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (Integration steps for idle validation and injection)
  - Existing route tests in `workspaces/Describing_Simulation_0/src/routes/__tests__/`
- **Objective**: Codify automation that installs dependencies, verifies no SSE traffic before start, uploads temperature-control systems/components, and confirms ACK responses.
- **Definition of Done**:
  1. Expand `tools/run_integration.sh` (or companion Node script) to spin up the service, probe SSE endpoints pre-start (ensuring silence), and perform HTTP uploads of plugin code/assets into the prescribed directories.
  2. Provide fixture plugin files representing the temperature control simulation/evaluation pair, placed under a dedicated `plugins/` subtree and referenced by the automation.
  3. Include spot checks (via Jest or script assertions) that ACK payloads reflect success for each injection, failing fast otherwise.

## Phase 3 Task 4: Execute & Capture Integration Proof
- **Lifecycle**: Phase 3 Integration Test — Steps 5 & 6 (Start Simulation, Validate Behavior)
- **Mindset**: Integrator
- **Workspace**: `tools/run_integration.sh`, `verifications/`, `memory/records/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (Integration final steps)
  - `instruction_documents/Describing_Simulation_0_bootstraps.md` (artifact logging)
- **Objective**: Run the end-to-end integration workflow, validate SSE outputs reflect the expected temperature-control behavior, and archive evidence.
- **Definition of Done**:
  1. Execute the integration tooling to start the simulation, monitor streams, and collect evaluation metrics demonstrating temperature stabilization.
  2. Persist captured outputs (logs, JSON snapshots, etc.) in `verifications/` with timestamped filenames, alongside narrative notes if required.
  3. Record a Phase 3 completion entry in `memory/records/` summarizing observed behavior, open issues, and readiness to advance to Phase 4.

<!-- Source: records/20251007184745_checkpoint9_task5_validation.md -->
# Task Record — Phase 2 Checkpoint IX Task 5

## Summary
- Ran `npm --prefix workspaces/Describing_Simulation_0 test` covering 27 suites (48 assertions) to confirm unit and integration layers remain green post server bootstrap work.
- Executed `./checks.sh`, verifying the repository-level harness delegates to the workspace Jest suite without regressions.
- Logged validation timestamps in `verifications/20251007T154720_checks.log` and confirmed readiness to advance into Phase 3 integration activities.

## Validation
- `npm --prefix workspaces/Describing_Simulation_0 test`
- `./checks.sh`

## Status
- Checkpoint IX Stage 5 complete. Handing off to Tasker/Implementer for Phase 3 Task 1 (Build & Start Service) per refreshed task queue.

<!-- Source: records/20251007190512_phase3_task1_build_start_service.md -->
# Task Record — Phase 3 Task 1 (Build & Start Service)

## Summary
- Implemented `src/main.ts` to assemble simulation/evaluation players, secure codebase file access helpers, bridge simulation frames into the evaluation pipeline, and start the HTTP server via `createServer`, logging the active endpoint.
- Extended `Server` to accept an optional host, updated bootstrap wiring, and refreshed Jest coverage to assert the listener arguments.
- Exposed a runnable CLI via `npm run start` (`package.json` + README update) and documented the Phase 3 task queue reference.
- Added `src/__tests__/main.test.ts` to validate bootstrap wiring, environment-derived ports, and logging behavior.

## Validation
- `npm --prefix workspaces/Describing_Simulation_0 test`
- `npm --prefix workspaces/Describing_Simulation_0 run build`

## Status
- Task complete. Ready to proceed with Phase 3 Task 2 (API discoverability enhancements).

<!-- Source: records/20251007191920_phase3_task2_information_routes.md -->
# Task Record — Phase 3 Task 2 (Surface API Usage)

## Summary
- Authored discoverability documentation under `src/routes/information/` (`api.md` and `Describing_Simulation.md`) to orient first-time operators.
- Implemented `registerInformationRoutes` to expose `/api`, `/api/information`, and per-document endpoints, returning segment metadata and markdown content through the router.
- Wired information routes into the server bootstrap and runtime start sequence with curated segment/document metadata sourced from the workspace.
- Expanded integration coverage to assert information route registration and added dedicated Jest tests for the new endpoints; refreshed the workspace README to flag the API landing page.

## Validation
- `npm --prefix workspaces/Describing_Simulation_0 test`
- `npm --prefix workspaces/Describing_Simulation_0 run build`

## Status
- Task complete. Continue with Phase 3 Task 3 (Automate injection workflow) per the task queue.

<!-- Source: records/20251007193852_phase3_task3_integration_automation.md -->
# Task Record — Phase 3 Task 3 (Automate Injection Workflow)

## Summary
- Implemented JSON-aware routing (`src/routes/router.ts`) with response helpers and request parsing to support HTTP automation, including SSE header flushing tweaks in simulation/evaluation routes for reliable streaming.
- Extended simulation bootstrap to load systems from module descriptors via the new loader in `src/main.ts`, wrapping arbitrary module exports into `System` instances and securing path resolution; registered helper wiring in `src/server/bootstrap.ts`.
- Authored temperature control plugin (`plugins/simulation/temperatureControlSystem.js`) and an integration runner (`tools/run_integration.js`) invoked by the enhanced `tools/run_integration.sh` to build the workspace, start the server, verify idle SSE state, inject the system over HTTP, and exercise playback controls.
- Added coverage for information/simulation routes and bootstrap wiring updates, ensuring Jest + TypeScript builds remain green.

## Validation
- `npm --prefix workspaces/Describing_Simulation_0 test`
- `npm --prefix workspaces/Describing_Simulation_0 run build`
- `./tools/run_integration.sh`

## Status
- Task complete. Proceed to Phase 3 Task 4 (run full integration to capture behavioral evidence).

<!-- Source: records/20251007194255_phase3_task4_integration_proof.md -->
# Task Record — Phase 3 Task 4 (Execute & Capture Integration Proof)

## Summary
- Enhanced IOPlayer to emit frame snapshots each tick, deriving entity/component payloads from the system manager while tracking tick counters; added snapshot tests to confirm frame publication cadence.
- Expanded router capabilities to parse JSON bodies, attach query params, and provide `res.json`, enabling the integration harness to interact with HTTP endpoints; verified behavior with new unit coverage.
- Hardened SSE endpoints with header flushing and authored a simulation plugin (temperature control) plus automation script updates to start the server, monitor streams, and exercise playback controls end-to-end.
- Captured live SSE output for simulation and evaluation players, persisting a proof artifact (`verifications/20251008T022702_integration.json`) demonstrating temperature stabilization behavior.

## Validation
- `npm --prefix workspaces/Describing_Simulation_0 test`
- `npm --prefix workspaces/Describing_Simulation_0 run build`
- `./tools/run_integration.sh`

## Status
- Phase 3 integration test complete with recorded evidence. Ready to transition towards Phase 4 validation planning.

<!-- Source: records/20251007194630_phase4_task_queue.md -->
# Phase 4 — Structural & Behavioral Validation Task Queue

## Task 1: Source Tree vs. Spec Audit
- **Lifecycle**: Phase 4 Structural Validation — Step 1
- **Mindset**: Tasker → Integrator (analysis-focused)
- **Workspace**: `workspaces/Describing_Simulation_0/src`, `instruction_documents/Describing_Simulation_0_codifying_simulations.md`, `instruction_documents/Describing_Simulation_0_table_of_contents.md`
- **Guardrails**:
  - Schedule of Work Phase 4 checklist (`instruction_documents/Describing_Simulation_0_schedule_of_work.md`)
  - Codifying Simulations structure section for expected files/components
- **Objective**: Inventory implemented files against the described layout, noting any missing or extra artifacts.
- **Definition of Done**:
  1. Produce a matrix (markdown) summarizing expected vs actual files/components/systems with discrepancies called out.
  2. Highlight any TODO/placeholder implementations requiring follow-up.
  3. Store findings in `memory/records/` for downstream behavioral checks.

## Task 2: Behavioral Verification Sweep
- **Lifecycle**: Phase 4 Behavioral Validation — Step 2
- **Mindset**: Integrator
- **Workspace**: `tools/run_integration.sh`, `./checks.sh`, `verifications/`
- **Guardrails**:
  - Phase 4 checklist (behavioral bullet points)
  - Integration artifact guidance from `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (Integration section)
- **Objective**: Re-run unit + integration harness, confirm logs/artifacts align with expectations (e.g., temperature stabilization), and update verification log.
- **Definition of Done**:
  1. Execute `npm --prefix workspaces/Describing_Simulation_0 test`, `./checks.sh`, and `./tools/run_integration.sh`, capturing outcomes.
  2. Append verification entries to `verifications/20251007T154720_checks.log` (or create new log if required) referencing the Phase 4 sweep.
  3. Note behavioral observations (e.g., SSE payload trends) in a record within `memory/records/`.

## Task 3: Documentation Consistency Review
- **Lifecycle**: Phase 4 Structural Validation — Step 3
- **Mindset**: Tasker → Implementer (documentation alignment)
- **Workspace**: `workspaces/Describing_Simulation_0/src/routes/information/`, `tools/index.md`, `README.md`, `instruction_documents/`
- **Guardrails**:
  - Phase 4 directive: “Descriptions of files match source code”
  - `Describing_Simulation_0_table_of_contents.md` for reference mapping
- **Objective**: Ensure outward-facing documentation (information routes, README, tools index) reflects implemented endpoints and workflow.
- **Definition of Done**:
  1. Update markdown/docs to resolve mismatches identified in Task 1.
  2. Add cross-links or notes for integration artifacts where helpful, avoiding redundant content.
  3. Record adjustments and remaining documentation gaps in `memory/records/`.

<!-- Source: records/20251007195012_phase4_task1_structure_audit.md -->
# Task Record — Phase 4 Task 1 (Structural Audit)

Reviewed the implemented workspace against the structure described in `instruction_documents/Describing_Simulation_0_codifying_simulations.md` and Phase 4 guidance.

## Expected vs Actual Matrix

| Area | Expected Artifact(s) | Status | Notes |
| --- | --- | --- | --- |
| Core › Entity | `Entity.ts`, `EntityManager.ts` | ✅ Present | Entity manager fully implemented with lifecycle helpers. |
| Core › Components | `ComponentType.ts`, `ComponentManager.ts`, `TimeComponent.ts` | ✅ Present | Matches spec; ComponentManager wired into IOPlayer snapshots. |
| Core › Systems | `System.ts`, `SystemManager.ts`, `TimeSystem.ts` | ✅ Present | TimeSystem implemented; additional helper methods align with spec. |
| Core › Messaging (bus/inbound/outbound) | `Bus.ts`, inbound/outbound helpers | ✅ Present | JSON routing relies on these; tests cover handlers/ack frames. |
| Core › Simulation Player | `IOPlayer.ts`, operations (`Start`, `Pause`, `Stop`, `InjectSystem`, `EjectSystem`) | ⚠️ Partial | `InjectSystemOperation.execute` still throws `Not implemented`; needs implementation before final validation. |
| Core › Evaluation Player | `EvaluationPlayer.ts`, operations (`InjectFrame`, `RegisterCondition`, `RemoveCondition`) | ✅ Present | All operations implemented; coverage verifies storage and acknowledgements. |
| Routes | `router.ts`, `simulation.ts`, `evaluation.ts`, `codebase.ts`, `information.ts` | ✅ Present | Router enhanced with JSON parsing per Phase 3; information routes align with docs. |
| Server | `server/index.ts`, `server/bootstrap.ts`, `main.ts` | ✅ Present | Bootstrap wires players, loaders, information segments. |
| Integration Harness | `src/integration/__tests__/SimEvalIntegration.test.ts`, `tools/run_integration.*` | ✅ Present | Test mocks route registration; runner emits verification artifact. |
| Plugins | `plugins/simulation/temperatureControlSystem.js` | ⚠️ Partial | Simulation plugin provided; evaluation plugin directory still absent (per spec, future work). |
| Documentation & Tooling | `routes/information/*.md`, `tools/index.md`, workspace README | ✅ Present | Content reflects latest workflow; Task 3 will double-check narrative alignment. |

## Discrepancies & TODOs

- **Simulation Inject Operation** — Implementation outstanding (`src/core/simplayer/operations/InjectSystemOperation.ts`). Behavioral validation should either stub expectations or complete logic.
- **Evaluation Plugins** — Spec references `plugins/evaluation/...`; current workspace lacks example assets. Not a blocker but worth noting for completeness.
- **Legacy tests** — All placeholder tests replaced except Inject operation; no further structural TODO markers detected.

No additional missing files were identified. Proceeding to Task 2 (behavioral verification sweep).

<!-- Source: records/20251007195618_phase4_task2_behavioral_sweep.md -->
# Task Record — Phase 4 Task 2 (Behavioral Verification Sweep)

## Summary
- Re-ran the full regression suite: `npm --prefix workspaces/Describing_Simulation_0 test`, `./checks.sh`, and the integration harness (`./tools/run_integration.sh`). All executions succeeded without regressions.
- Integration run generated fresh stream artifacts (`verifications/20251008T052837_integration.json`) demonstrating temperature stabilization: simulation stream ticks 1–5 heat toward the target; evaluation stream ticks 6–10 oscillate around 72°F with heater toggling.
- Verification log updated with Phase 4 timestamps in `verifications/20251007T154720_checks.log`.

## Validation
- `npm --prefix workspaces/Describing_Simulation_0 test`
- `./checks.sh`
- `./tools/run_integration.sh`

## Observations
- Simulation player now publishes frames immediately on start, ensuring integration captures meaningful data without manual delays.
- Evaluation SSE stream remains empty until frames are injected via simulation → evaluation bridge; current automation collects both streams, but evaluation data mirrors simulation due to direct frame injection (no additional evaluation-specific systems yet).

## Status
- Behavioral sweep complete. Ready to proceed with Task 3 (documentation consistency review).

<!-- Source: records/20251007200104_phase4_task3_documentation_alignment.md -->
# Task Record — Phase 4 Task 3 (Documentation Consistency Review)

## Summary
- Refreshed workspace README to reference the API landing JSON, up-to-date task queues, and integration tooling alongside `./checks.sh`.
- Confirmed `routes/information/api.md`, `routes/information/Describing_Simulation.md`, and `tools/index.md` accurately describe the current server surface and integration workflow; no changes required beyond the README update.
- Verified integration runner script documents the five automation steps and now captures SSE artifacts tied to verifications.

## Observations
- Information markdown reflects core ECS concepts and upload workflow; future evaluation plugins can be linked once available.
- README still references pending InjectSystemOperation completion (captured in structural audit) as part of overall TODO awareness.

## Status
- Documentation alignment complete. Phase 4 structural & behavioral validation tasks concluded; ready to plan next steps (Phase 5 or Inject operation follow-up).

<!-- Source: records/20251007200430_inject_system_operation_implemented.md -->
# Task Record — Inject System Operation Implementation

## Summary
- Implemented `InjectSystemOperation` to delegate to the IO player and emit success acknowledgements; invalid payloads now throw explicit errors.
- Added unit coverage ensuring a system is passed through and missing payloads are rejected.

## Validation
- `npm --prefix workspaces/Describing_Simulation_0 test -- injectSystemOperation.test.ts`
- `npm --prefix workspaces/Describing_Simulation_0 test`

## Status
- Operation ready for inbound automation; structural audit discrepancy resolved.

<!-- Source: records/20251007224130_phase5_task_queue.md -->
# Phase 5 — Optimization Task Queue

## Task 1: Capture Performance Baseline
- **Lifecycle**: Phase 5 Optimization — Step 1 (Profiling Setup)
- **Mindset**: Tasker → Integrator (measurement-focused)
- **Workspace**: `tools/`, `workspaces/Describing_Simulation_0/src/core/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_schedule_of_work.md` — Phase 5 optimization expectations (runtime & memory inspection).
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Core loop and messaging architecture (Frame publishing, Bus usage).
  - Latest verification artifacts in `verifications/` to understand current throughput.
- **Objective**: Establish a repeatable profiling harness that exercises the simulation loop for hundreds of ticks, capturing wall-clock timing and memory high-water marks without modifying production logic.
- **Definition of Done**:
  1. Add a script under `tools/` (e.g., `benchmark_simulation.js`) that boots the compiled workspace, injects the temperature control system, and advances at least 500 ticks while capturing duration and RSS deltas via `process.hrtime.bigint()` and `process.memoryUsage()`.
  2. Persist the baseline metrics to `verifications/` (timestamped JSON or log) and summarize key figures in a new record within `memory/records/`.
  3. Run `npm --prefix workspaces/Describing_Simulation_0 test` and `./tools/run_integration.sh` to confirm the harness does not regress existing behavior.

## Task 2: Optimize Bus Publish Path
- **Lifecycle**: Phase 5 Optimization — Step 2 (Hot-path Tightening)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/messaging/Bus.ts`, `workspaces/Describing_Simulation_0/src/core/messaging/__tests__/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Messaging bus requirements.
  - Profiling output from Task 1 pinpointing publish overhead.
  - `instruction_documents/Describing_Simulation_0_implementation_guidelines.md` — TDD discipline for refactors.
- **Objective**: Remove the per-publish array spread (`[...subscribers]`) to cut allocation churn while preserving safe iteration when subscribers unsubscribe or re-subscribe during callbacks.
- **Definition of Done**:
  1. Refactor `Bus.publish` to iterate without cloning while defending against subscription mutations (e.g., tolerate unsubscribes during dispatch).
  2. Extend tests to cover subscriber removal within a callback and ensure order guarantees remain (`Bus.test.ts` should assert no skipped deliveries).
  3. Execute workspace unit tests and integration script, updating the verification log with results tied to the optimization.

## Task 3: Reduce Frame Snapshot Allocations
- **Lifecycle**: Phase 5 Optimization — Step 3 (Simulation Loop Efficiency)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/simplayer/IOPlayer.ts`, `workspaces/Describing_Simulation_0/src/core/components/ComponentManager.ts`, relevant tests.
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Frame construction expectations for outbound messaging.
  - Baseline metrics from Task 1 to target allocation hotspots (tick snapshot creation).
  - Existing unit coverage (`IOPlayer` and component manager specs) to guide regression checks.
- **Objective**: Trim per-tick object churn when creating frame snapshots (e.g., reuse accumulator objects or expose a leaner component snapshot helper) without leaking mutable references to subscribers.
- **Definition of Done**:
  1. Implement an approach that avoids rebuilding intermediate arrays/maps on every tick (consider introducing a `ComponentManager.snapshot(entity)` helper or reusing buffers in `IOPlayer`).
  2. Update or add tests ensuring frame payloads remain correct and immutable from the caller’s perspective; include a regression test that mutating the published frame does not affect subsequent ticks.
  3. Validate changes via workspace tests and integration script, capturing before/after notes referencing Task 1 metrics.

## Task 4: Re-benchmark and Document Gains
- **Lifecycle**: Phase 5 Optimization — Step 4 (Validation & Documentation)
- **Mindset**: Integrator
- **Workspace**: `tools/`, `verifications/`, `memory/records/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_schedule_of_work.md` — Requirement to validate optimizations with integration tests.
  - Profiling harness from Task 1.
  - Verification logging conventions in `verifications/README.md`.
- **Objective**: Re-run the profiling harness and integration workflows post-optimization, quantifying improvements and ensuring no behavioral regressions.
- **Definition of Done**:
  1. Execute the benchmark script, unit tests, `./checks.sh`, and `./tools/run_integration.sh`, recording output artifacts alongside baseline data.
  2. Append a comparative summary (baseline vs improved throughput and memory) to `verifications/` and a dedicated memory record outlining residual risks or further optimization ideas.
  3. Confirm README or information routes do not require updates after performance tuning; note explicitly if no documentation changes are necessary.

<!-- Source: records/20251009115043_phase5_task1_performance_baseline.md -->
# Task Record — Phase 5 Task 1 (Performance Baseline)

## Summary
- Added `tools/benchmark_simulation.js` to launch the compiled workspace, stream 500 ticks, and capture runtime/memory metrics for optimization tracking.
- Baseline run captured `500` frames in `25426.0622 ms` (≈`19.6649` ticks/sec) with RSS increasing by ~2.0 MB; artifact stored at `verifications/20251009T155032_benchmark.json`.

## Observations
- Startup + injection overhead negligible relative to frame processing; main runtime is continuous tick evaluation.
- Memory footprint remains stable (heap delta negative, RSS +2 MB) suggesting allocations can be reclaimed—future work should focus on per-tick throughput.

## Validation
- `npm --prefix workspaces/Describing_Simulation_0 run build`
- `node tools/benchmark_simulation.js`

<!-- Source: records/20251009123000_phase5_task_queue_update.md -->
# Phase 5 — Optimization Task Queue (Post-Baseline Update)

## Context
- Baseline metrics from `verifications/20251009T155032_benchmark.json` capture 500 frames in 25 426.0622 ms (≈19.6649 ticks/sec).
- The throughput ceiling aligns with `IOPlayer`'s `DEFAULT_CYCLE_INTERVAL_MS = 50`, so optimizations will remain invisible until the timer delay can be overridden during benchmarking.
- This queue supersedes Tasks 2–4 from `memory/records/20251007224130_phase5_task_queue.md`, retaining Task 1 as complete and sequencing the remaining Phase 5 work to expose measurable gains.

## Task 2: Enable Fast-Cycle Benchmark Mode
- **Lifecycle**: Phase 5 Optimization — Step 2 (Measurement Refinement)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/main.ts`, `workspaces/Describing_Simulation_0/src/core/simplayer/IOPlayer.ts`, `workspaces/Describing_Simulation_0/src/core/evalplayer/EvaluationPlayer.ts`, `tools/benchmark_simulation.js`, associated unit tests.
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_schedule_of_work.md` — Optimization cadence and validation expectations.
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Player construction and messaging architecture.
  - `memory/records/20251009115043_phase5_task1_performance_baseline.md` — Baseline observations and verification workflow.
- **Objective**: Allow workspace consumers (benchmark harness, future tooling) to run simulation ticks without the 50 ms wall-clock delay so throughput improvements become observable while preserving default behaviour for integration tests.
- **Definition of Done**:
  1. Extend `start` options (type definitions and implementation) to accept an optional `cycleIntervalMs` override and apply it when instantiating both simulation and evaluation players, defaulting to 50 ms when unspecified.
  2. Update `tools/benchmark_simulation.js` to request a near-zero interval during measurements while keeping `tools/run_integration.js` and CLI usage on the default cadence. Add or adjust unit coverage to confirm the override is honoured.
  3. Run `npm --prefix workspaces/Describing_Simulation_0 test` and `./tools/run_integration.sh` to ensure behaviour remains stable; capture any documentation touch-ups required (e.g., `README.md` options) in the task record.

## Task 3: Optimize Bus Publish Path
- **Lifecycle**: Phase 5 Optimization — Step 3 (Hot-path Tightening)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/messaging/Bus.ts`, `workspaces/Describing_Simulation_0/src/core/messaging/__tests__/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Messaging bus invariants and subscriber lifecycle expectations.
  - Updated benchmarking harness from Task 2 for validating throughput changes.
  - `instruction_documents/Describing_Simulation_0_implementation_guidelines.md` — Refactor discipline and regression safety.
- **Objective**: Eliminate the per-publish `[...]` clone and any avoidable allocations while preserving subscriber ordering and resilience to unsubscribe/resubscribe during dispatch.
- **Definition of Done**:
  1. Refactor `Bus.publish` to iterate without cloning, defending against subscriber mutations (unsubscribes/resubscribes) and re-entrancy.
  2. Expand tests to cover unsubscribe-inside-callback, re-entrancy, and idempotent delivery ordering guarantees.
  3. Execute workspace tests and `./tools/run_integration.sh`; record quick benchmark readings (using the fast-cycle mode) alongside notes on behavioural parity.

## Task 4: Reduce Frame Snapshot Allocations
- **Lifecycle**: Phase 5 Optimization — Step 4 (Simulation Loop Efficiency)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/simplayer/IOPlayer.ts`, `workspaces/Describing_Simulation_0/src/core/components/ComponentManager.ts`, `workspaces/Describing_Simulation_0/src/core/messaging/outbound/FrameFilter.ts`, relevant tests.
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Frame construction and component exposure constraints.
  - Baseline benchmark artefacts plus post-Task-3 measurements to target allocation hotspots.
  - Existing unit suites for `IOPlayer`, component manager, and outbound messaging.
- **Objective**: Cut per-tick object churn (entity list copies, component arrays, frame cloning) while ensuring published frames stay immutable from subscriber perspectives.
- **Definition of Done**:
  1. Introduce reusable buffers/helpers (e.g., a `ComponentManager` snapshot iterator or cached entity scratch maps) so `IOPlayer.createFrameSnapshot` avoids rebuilding temporary arrays/maps each tick.
  2. Adjust `FrameFilter` (and related code) to skip unnecessary shallow copies when no blacklist is active while still preventing callers from mutating internal state.
  3. Add regression tests proving frame payloads remain correct and isolated across ticks, then run unit tests, integration script, and grab indicative benchmarks noting memory deltas.

## Task 5: Re-benchmark and Document Gains
- **Lifecycle**: Phase 5 Optimization — Step 5 (Validation & Documentation)
- **Mindset**: Integrator
- **Workspace**: `tools/benchmark_simulation.js`, `verifications/`, `memory/records/`, `README.md` (if changes surfaced).
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_schedule_of_work.md` — Validation and reporting requirements.
  - Fast-cycle benchmarking harness from Task 2.
  - Verification logging conventions in `verifications/README.md`.
- **Objective**: Quantify the cumulative runtime/memory improvements and ensure the optimized build passes the established verification envelope.
- **Definition of Done**:
  1. Run `npm --prefix workspaces/Describing_Simulation_0 test`, `./tools/run_integration.sh`, and the benchmark harness (including the fast-cycle configuration). Persist new artefacts in `verifications/` with timestamps.
  2. Produce a memory record summarizing baseline vs. improved metrics, residual risks, and any follow-up optimization ideas.
  3. Confirm README/information routes remain accurate post-optimization, noting explicitly if no updates were necessary.

<!-- Source: records/20251009125440_phase5_task2_fast_cycle_mode.md -->
# Task Record — Phase 5 Task 2 (Fast-Cycle Benchmark Mode)

## Summary
- Extended `start` options in `workspaces/Describing_Simulation_0/src/main.ts` to accept `cycleIntervalMs`, plumbing the override into simulation and evaluation player construction.
- Updated `EvaluationPlayer` and the benchmarking harness (`tools/benchmark_simulation.js`) to honor a zero-delay configuration so throughput measurements are not timer-bound.
- Documented the new runtime option in `workspaces/Describing_Simulation_0/README.md` and added coverage in `src/__tests__/main.test.ts` to verify the override reaches both players.

## Validation
- `npm --prefix workspaces/Describing_Simulation_0 test`
- `./tools/run_integration.sh`

## Artifacts
- Integration snapshot: `verifications/20251009T165422_integration.json`

<!-- Source: records/20251009130315_phase4_alignment_refresh.md -->
# Task Record — Phase 4 Alignment Refresh

## Summary
- Re-ran structural alignment per `instruction_documents/Describing_Simulation_0_codifying_simulations.md` using the post-optimization codebase.
- Confirmed all core scaffolding files remain in place (`Entity*`, `Component*`, `System*`, messaging buses/filters, players, operations) with implementations matching their spec roles.
- Verified prior gap (`InjectSystemOperation`) is now implemented, and the new `cycleIntervalMs` option in `src/main.ts` preserves the default 50 ms cadence while enabling fast-cycle benchmarking in compliance with the spec.
- Noted unchanged variance: evaluation plugin scaffolding under `plugins/evaluation/` remains todo per spec’s future-work guidance.

## Follow-ups
- Populate exemplar evaluation plugins when the spec advances to that stage; no immediate blockers for current alignment scope.

<!-- Source: records/20251009183500_phase4_alignment_refresh.md -->
# Task Record — Phase 4 Alignment Refresh

## Summary
- Re-ran the Phase 4 structural checklist against `instruction_documents/Describing_Simulation_0_codifying_simulations.md`; all core scaffolding files (`entity`, `components`, `systems`, messaging helpers, IO/evaluation players, operations, routes, server bootstrap, documentation) remain present and aligned with their described responsibilities.
- Confirmed the simulation/evaluation server wiring stays in sync with the spec after recent optimizer work: `IOPlayer` still exposes the expected playback contract, `InjectSystemOperation` and peers are implemented, and `main.ts` continues to surface the `cycleIntervalMs` tuning without regressing default cadence.
- Removed the redundant root-level `src/` directory (duplicate of the workspace tree) so the published repository now mirrors the spec’s single-source workspace layout.

## Validation
- `npm test` (within `workspaces/Describing_Simulation_0/`)
- `./checks.sh`
- `./tools/run_integration.sh`

## Artifacts
- Integration rerun captured `verifications/20251009T182750_integration.json`, confirming the temperature-control scenario still exercises injection, playback, and SSE capture successfully.

## Follow-ups
- None.

<!-- Source: records/20251009231103_concat_memories.md -->
# Task Record — Memory Consolidation

## Summary
- Gathered existing memory records to prepare a single consolidated reference artifact.
- Captured current task context under the implementer mindset per `instruction_documents/mindset_prompts/Describing_Simulation_0_implementer_prompt.md`.
- Generated `memory/all_memories.md` aggregating every memory markdown entry with source annotations.

## Actions
- Confirmed memory sources reside under `memory/records/` and noted no `memory/ways/` entries to include.
- Wrote a consolidation script to stitch the ordered contents into `memory/all_memories.md`, skipping the target file to avoid recursion.

## Validation
- Counted 65 markdown inputs and confirmed the consolidated file includes 65 matching `<!-- Source: ... -->` markers.

## Follow-ups
- None.
