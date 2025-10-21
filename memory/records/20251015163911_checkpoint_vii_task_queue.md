# Phase 2 Checkpoint VII Task Queue

Scope: Implement the Simulation Player playback controls per `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (Section VII) following the TDD cadence from `instruction_documents/Describing_Simulation_0_implementation_guidelines.md`.

1. **Stage 1 – Simulation Player Skeletons**
   - Mindset: Implementer (`instruction_documents/mindset_prompts/Describing_Simulation_0_implementer_prompt.md`)
   - Workspace: `workspaces/Describing_Simulation_0/src/core/simplayer/SimulationPlayer.ts`, `workspaces/Describing_Simulation_0/src/core/simplayer/operations/{Start,Pause,Stop}.ts`
   - Done when: Directory scaffold and class/function skeletons exist for the Simulation Player and its three operations, exporting them without behavior; message type constants stubbed in line with `memory/ways/simulation_message_naming.md`.

2. **Stage 2 – Simulation Player Test Intents**
   - Mindset: Implementer
   - Workspace: Comment-only Vitest specs under `workspaces/Describing_Simulation_0/src/core/simplayer/__tests__/SimulationPlayer.test.ts` and `workspaces/Describing_Simulation_0/src/core/simplayer/operations/__tests__/{Start,Pause,Stop}.test.ts`
   - Done when: Comments articulate expectations for handler registration, acknowledgement behavior, and delegation to `Player.start/pause/stop` without executable assertions.

3. **Stage 3 – Simulation Player Tests**
   - Mindset: Implementer
   - Workspace: Same test files as Stage 2
   - Done when: Vitest cases assert (a) operations trigger the correct `Player` lifecycle method and ignore payload noise, (b) operations surface success acknowledgements via `MessageHandler`, and (c) `SimulationPlayer` registers handlers for `simulation.start|pause|stop` with the inbound registry.

4. **Stage 4 – Simulation Player Implementation**
   - Mindset: Implementer
   - Workspace: Simulation player and operation source files
   - Done when: Operations call through to the appropriate lifecycle method, optionally idempotent, and the `SimulationPlayer` constructor wires inbound handlers and exposes any needed helper API without breaking existing tests.

5. **Stage 5 – Validation**
   - Mindset: Integrator (`instruction_documents/mindset_prompts/Describing_Simulation_0_integrator_prompt.md`)
   - Workspace: Run from `workspaces/Describing_Simulation_0`
   - Done when: `npm test` succeeds with the new suites and results are noted for the follow-up record.
