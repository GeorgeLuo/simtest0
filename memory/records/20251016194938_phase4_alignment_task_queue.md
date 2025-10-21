# Phase 4 Alignment Task Queue

Scope: Transition from completed Phase 3 integration toward Phase 4 structural and behavioral alignment, addressing outstanding Stage 4 artifacts and enforcing the repository specification defined in `instruction_documents/Describing_Simulation_0_code_structure.md`, `instruction_documents/Describing_Simulation_0_repository_structure.md`, and `instruction_documents/Describing_Simulation_0_api_map.md`.

1. **Phase 2 · Checkpoint IX · Stage 4 – Informational Artifacts**
   - Mindset: Implementer (`instruction_documents/mindset_prompts/Describing_Simulation_0_implementer_prompt.md`)
   - Guardrails: `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (§IX Information), `instruction_documents/Describing_Simulation_0_api_map.md`, `instruction_documents/Describing_Simulation_0_original.md`
   - Workspace: `workspaces/Describing_Simulation_0/src/information/Api.md`, `workspaces/Describing_Simulation_0/src/information/Describing_Simulation.md`, `workspaces/Describing_Simulation_0/src/routes/information.ts`, related route specs under `workspaces/Describing_Simulation_0/src/routes/__tests__/information.test.ts`
   - Done when: Both markdown artifacts replace their TODO placeholders with curated content drawn from the instruction sources, preserving headings and endpoint summaries required by the `/information` routes; route tests are updated if assertions expect specific copy; `npx vitest run src/routes/__tests__/information.test.ts` passes and documentation responses returned by the integration script reflect the updated text.

2. **Phase 0 · Bootstraps – Implement Repository Checks Script**
   - Mindset: Implementer
   - Guardrails: `instruction_documents/Describing_Simulation_0_bootstraps.md` (§Checks), `tools/index.md`, `memory/records/20251016124212_phase3_integration_execution.md`
   - Workspace: `checks.sh`, `tools/run_integration.sh`, `verifications/`
   - Done when: `checks.sh` orchestrates a clean build (`npm run build`), unit test sweep (`npm test`), and optionally the integration harness, teeing command output to `verifications/checks_<timestamp>.log`; the script exits non-zero on failures and is documented in `tools/index.md` if invocation semantics change.

3. **Phase 4 – Structural Alignment (Repository & Documents)**
   - Mindset: Aligner (`instruction_documents/mindset_prompts/Describing_Simulation_0_aligner_prompt.md`)
   - Guardrails: `instruction_documents/Describing_Simulation_0_code_structure.md`, `instruction_documents/Describing_Simulation_0_repository_structure.md`, `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (§IX), `memory/records/20251016015255_checkpoint_ix_stage4_server_main.md`
   - Workspace: `workspaces/Describing_Simulation_0/src/**`, `workspaces/Describing_Simulation_0/plugins/**`, `checks.sh`, `tools/`, `memory/`
   - Done when: Workspace directories and filenames mirror the spec (e.g., informational markdown resides under the path specified in the code structure, `api.md` casing matches, server module placement is reconciled or documented via a memory/exception), plugin directories are organized as `plugins/{simulation,evaluation}/{components,systems,operations}/`, and any structural deviations are either corrected or captured in `memory/exceptions/`; update related imports/tests to keep builds green.

4. **Phase 4 – Behavioral Alignment (HTTP Surface)**
   - Mindset: Aligner
   - Guardrails: `instruction_documents/Describing_Simulation_0_api_map.md`, `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (§IX), integration artifacts under `verifications/`
   - Workspace: `workspaces/Describing_Simulation_0/src/routes/**/*.ts`, `workspaces/Describing_Simulation_0/src/server/Server.ts`, `workspaces/Describing_Simulation_0/src/main.ts`, route/server specs
   - Done when: Each of the 22 endpoints is verified against the API map for method/path/behavior (acknowledgements, SSE streaming, plugin placement, documentation responses), discrepancies are resolved or logged as exceptions, new or updated tests cover any previously unverified behavior, and a record is written summarizing the alignment check with references to executed validation commands (`npm test`, `./tools/run_integration.sh`, or `./checks.sh`).

5. **Phase 4 – Alignment Journal**
   - Mindset: Aligner
   - Guardrails: `instruction_documents/Describing_Simulation_0_schedule_of_work.md` (Phase 4), `memory/records` conventions
   - Workspace: `memory/records/`
   - Done when: After structural and behavioral alignment complete, capture a consolidated memory record outlining adjustments made, outstanding exceptions (if any), and readiness for Phase 5 optimization, linking to updated verification artifacts.

