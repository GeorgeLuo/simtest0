# Phase 2 Checkpoint IX Stage 4+ Task Queue

Scope: Complete the Sim-Eval server implementation described in Section IX of `instruction_documents/Describing_Simulation_0_codifying_simulations.md`, delivering the HTTP surface defined in `instruction_documents/Describing_Simulation_0_api_map.md` and preparing for validation.

1. **Stage 4 – Router Implementation**
   - Mindset: Implementer (`instruction_documents/mindset_prompts/Describing_Simulation_0_implementer_prompt.md`)
   - Workspace: `workspaces/Describing_Simulation_0/src/routes/router.ts` (new helper modules may live under `workspaces/Describing_Simulation_0/src/routes/`)
   - References: `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (§IX Router), `instruction_documents/Describing_Simulation_0_api_map.md` (routing table)
   - Done when: Router stores immutable route snapshots, parses method/path/query/body for Node `http.IncomingMessage`, dispatches handlers, applies default JSON responses, surfaces 404/500 structures, and leaves streaming responses open; `vitest run src/routes/__tests__/router.test.ts` passes.

2. **Stage 4 – Simulation & Evaluation Route Handlers**
   - Mindset: Implementer
   - Workspace: `workspaces/Describing_Simulation_0/src/routes/simulation.ts`, `workspaces/Describing_Simulation_0/src/routes/evaluation.ts`
   - References: `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (§IX Simulation, §IX Evaluation), `instruction_documents/Describing_Simulation_0_api_map.md` (endpoints 4–17), `memory/ways/simulation_message_naming.md`, `memory/ways/evaluation_message_naming.md`
   - Done when: Both registrars publish `simulation.<action>` and `evaluation.frame` messages with generated IDs, await acknowledgement events with timeout handling, and expose SSE streams that subscribe/unsubscribe to outbound buses while emitting Server-Sent Events; `vitest run src/routes/__tests__/simulation.test.ts src/routes/__tests__/evaluation.test.ts` passes.

3. **Stage 4 – Information & System Routes**
   - Mindset: Implementer
   - Workspace: `workspaces/Describing_Simulation_0/src/routes/information.ts`, `workspaces/Describing_Simulation_0/src/routes/system.ts`
   - References: `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (§IX Router, §IX Simulation, §IX System), `instruction_documents/Describing_Simulation_0_api_map.md` (endpoints 1–3, 21–22)
   - Done when: Informational routes return discoverability metadata plus markdown from dependencies, system routes invoke `collectHealth`/`collectStatus` with error wrapping, and all assertions in `vitest run src/routes/__tests__/information.test.ts src/routes/__tests__/system.test.ts` succeed.

4. **Stage 4 – Codebase Routes**
   - Mindset: Implementer
   - Workspace: `workspaces/Describing_Simulation_0/src/routes/codebase.ts`
   - References: `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (§IX Codebase), `instruction_documents/Describing_Simulation_0_api_map.md` (endpoints 18–20)
   - Done when: Tree/file/plugin handlers recursively enumerate the repository, normalize requested paths, protect against directory traversal, persist uploads under the plugin root, and satisfy `vitest run src/routes/__tests__/codebase.test.ts`.

5. **Stage 4 – Server Orchestration & Entrypoint Wiring**
   - Mindset: Implementer
   - Workspace: `workspaces/Describing_Simulation_0/src/server/Server.ts`, `workspaces/Describing_Simulation_0/src/main.ts`
   - References: `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (§IX Main, §IX Server), `instruction_documents/Describing_Simulation_0_repository_structure.md` (workspace layout), `instruction_documents/Describing_Simulation_0_bootstraps.md` (tools/memory expectations)
   - Done when: `Server` boots a Node HTTP server around the router, links simulation outbound frames into evaluation inbound ingestion, tracks lifecycle for repeatable start/stop, and disposes players; `createServer` builds fully-wired players, buses, registries, registers all routes (including information/system/codebase), seeds plugin directories, and `main` starts the server with default `{ port: 3000, host: "0.0.0.0" }`; `vitest run src/server/__tests__/Server.test.ts src/main.test.ts` passes.

6. **Stage 4 – Populate Informational Artifacts**
   - Mindset: Implementer
   - Workspace: `workspaces/Describing_Simulation_0/src/information/Api.md`, `workspaces/Describing_Simulation_0/src/information/Describing_Simulation.md`
   - References: `instruction_documents/Describing_Simulation_0_api_map.md`, `instruction_documents/Describing_Simulation_0_codifying_simulations.md`, `instruction_documents/Describing_Simulation_0_original.md`
   - Done when: Markdown artifacts reflect the current API and theory (no TODO placeholders remain) and surface sections consumable via the information routes; ensure updated copies are linked by route handlers.

7. **Stage 5 – Validation**
   - Mindset: Integrator (`instruction_documents/mindset_prompts/Describing_Simulation_0_integrator_prompt.md`)
   - Workspace: `workspaces/Describing_Simulation_0`
   - References: `instruction_documents/Describing_Simulation_0_schedule_of_work.md` (Phase 2 Stage 5 guidance)
   - Done when: `npm test` completes successfully on a clean build, and a follow-up record captures the command, outcome, and any deviations or follow-up actions.
