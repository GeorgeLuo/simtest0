# Phase 2 Checkpoint VIII Task Queue

Scope: Build the Evaluation Player per Section VIII of `instruction_documents/Describing_Simulation_0_codifying_simulations.md`, following the TDD workflow in `instruction_documents/Describing_Simulation_0_implementation_guidelines.md`.

1. **Stage 1 – Evaluation Player Skeletons**
   - Mindset: Implementer (`instruction_documents/mindset_prompts/Describing_Simulation_0_implementer_prompt.md`)
   - Workspace: `workspaces/Describing_Simulation_0/src/core/evalplayer/EvaluationPlayer.ts`, `workspaces/Describing_Simulation_0/src/core/evalplayer/operations/InjectFrame.ts`, supporting message constant exports
   - Done when: Directory scaffold and class/function skeletons exist for the Evaluation Player and `InjectFrame` operation, exporting message identifiers aligned to inbound `evaluation.frame` messaging; constructor wiring and placeholders avoid business logic.

2. **Stage 2 – Evaluation Player Test Intents**
   - Mindset: Implementer
   - Workspace: Comment-only Vitest specs under `workspaces/Describing_Simulation_0/src/core/evalplayer/__tests__/EvaluationPlayer.test.ts` and `workspaces/Describing_Simulation_0/src/core/evalplayer/operations/__tests__/InjectFrame.test.ts`
   - Done when: Comments capture expectations for frame ingestion, entity creation, outbound filtering, and acknowledgement flow without executable code.

3. **Stage 3 – Evaluation Player Tests**
   - Mindset: Implementer
   - Workspace: Same test files as Stage 2
   - Done when: Vitest cases assert that `InjectFrame` creates entities with frame components, acknowledgements succeed, and `EvaluationPlayer` publishes filtered frames while keeping historical data hidden.

4. **Stage 4 – Evaluation Player Implementation**
   - Mindset: Implementer
   - Workspace: Evaluation player and operation source files (plus new component definitions if required)
   - Done when: Evaluation player wires inbound registry handlers, frame storage, and outbound publishing per the spec, and all Stage 3 tests compile though they may not yet pass before validation.

5. **Stage 5 – Validation**
   - Mindset: Integrator (`instruction_documents/mindset_prompts/Describing_Simulation_0_integrator_prompt.md`)
   - Workspace: Run from `workspaces/Describing_Simulation_0`
   - Done when: `npm test` passes with the newly added evaluation suites, and results are recorded for the checkpoint.
