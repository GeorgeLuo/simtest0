# Phase 2 Checkpoint IX Task Queue

Scope: Stand up the Sim-Eval HTTP surface described in Section IX of `instruction_documents/Describing_Simulation_0_codifying_simulations.md`, implementing the API defined in `instruction_documents/Describing_Simulation_0_api_map.md` while wiring it to the existing Simulation and Evaluation players. Complete the Evaluation Player implementation (Checkpoint VIII Stage 4/5) before beginning these steps.

1. **Stage 1 – Sim-Eval Server Skeletons**
   - Mindset: Implementer (`instruction_documents/mindset_prompts/Describing_Simulation_0_implementer_prompt.md`)
   - Workspace: `workspaces/Describing_Simulation_0/src/main.ts`, `workspaces/Describing_Simulation_0/src/server/Server.ts`, `workspaces/Describing_Simulation_0/src/routes/router.ts`, `workspaces/Describing_Simulation_0/src/routes/{simulation,evaluation,codebase}.ts`, `workspaces/Describing_Simulation_0/src/routes/information.ts`, `workspaces/Describing_Simulation_0/src/routes/system.ts`, informational markdown under `workspaces/Describing_Simulation_0/src/information/{Api.md,Describing_Simulation.md}`
   - Done when: Entry-point, server, router, and route modules exist with exported class/function scaffolds, message constants, and TODO stubs, plus placeholder markdown artifacts copied or linked from the instruction documents without implementing business logic.

2. **Stage 2 – Sim-Eval Server Test Intents**
   - Mindset: Implementer
   - Workspace: Comment-only Vitest specs under `workspaces/Describing_Simulation_0/src/server/__tests__/Server.test.ts`, `workspaces/Describing_Simulation_0/src/routes/__tests__/{router.test.ts,simulation.test.ts,evaluation.test.ts,codebase.test.ts,information.test.ts,system.test.ts}`, and `workspaces/Describing_Simulation_0/src/main.test.ts`
   - Done when: Comments capture expectations for (a) bootstrapping both players, (b) routing requests to player operations and component/system registries, (c) server-sent event streams, (d) informational/document endpoints, and (e) health/status reporting, referencing the API map for required behaviors without executable assertions.

3. **Stage 3 – Sim-Eval Server Tests**
   - Mindset: Implementer
   - Workspace: Same spec files from Stage 2
   - Done when: Vitest suites assert that HTTP requests reach the corresponding inbound handlers, acknowledgements and errors propagate to responses, documentation endpoints return markdown, plugin uploads write to a staging location, and outbound stream endpoints subscribe to the correct buses (use spies/mocks as needed); tests may rely on in-memory servers via Node’s `http` module.

4. **Stage 4 – Sim-Eval Server Implementation**
   - Mindset: Implementer
   - Workspace: Server and route modules plus supporting utilities created in Stage 1
   - Done when: The server composes Simulation and Evaluation players, registers all 22 endpoints from the API map, bridges message buses for SSE streaming, handles plugin storage hooks, and returns structured JSON/markdown per the spec while satisfying Stage 3 tests.

5. **Stage 5 – Validation**
   - Mindset: Integrator (`instruction_documents/mindset_prompts/Describing_Simulation_0_integrator_prompt.md`)
   - Workspace: Run from `workspaces/Describing_Simulation_0`
   - Done when: `npm test` passes with the new server suites on a clean build, and validation notes (test command, high-level result) are captured in a follow-up record.

