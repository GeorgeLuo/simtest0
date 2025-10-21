# Phase 2 Checkpoint IX Stage 5 & Phase 3 Integration Task Queue

## Task 1 — Phase 2 · Checkpoint IX · Stage 5 Validation
- Mindset: Integrator (`instruction_documents/mindset_prompts/Describing_Simulation_0_integrator_prompt.md`)
- Guardrails: Implementation Guidelines Stage 5 (`instruction_documents/Describing_Simulation_0_implementation_guidelines.md`), Checkpoint IX scope (`memory/records/20251015233545_checkpoint_ix_task_queue.md`)
- Workspace: `workspaces/Describing_Simulation_0`
- Done when:
  1. Clean build artifacts (`rm -rf dist && npm run build`) to ensure TypeScript output is fresh.
  2. Execute `npm test` and confirm all suites, including the new server tests, pass without flakiness.
  3. Capture the command(s) run and high-level results in a new validation record under `memory/records/`.

## Task 2 — Phase 3 Integration · Script Implementation
- Mindset: Implementer (`instruction_documents/mindset_prompts/Describing_Simulation_0_implementer_prompt.md`)
- Guardrails: Integration steps (`instruction_documents/Describing_Simulation_0_codifying_simulations.md` §Integration), Tools index (`tools/index.md`)
- Workspace: `tools/run_integration.sh`, `tools/index.md`, supporting helper scripts under `tools/`
- Done when:
  1. `run_integration.sh` encodes the Integration steps with inline comments for Build & Start Service, Learn Usage, Validate State, Inject Systems/Components, Start Simulation, and Validate Behavior.
  2. The script orchestrates building (`npm run build`), booting the compiled server (e.g., `node dist/main.js` in the background with lifecycle management), and issues HTTP requests (curl or node) to exercise the API map, including plugin uploads to `plugins/`.
  3. `tools/index.md` documents how to execute the integration workflow and points to produced artifacts.

## Task 3 — Phase 3 Integration · Execution & Artifacts
- Mindset: Integrator (`instruction_documents/mindset_prompts/Describing_Simulation_0_integrator_prompt.md`)
- Guardrails: Integration steps (`instruction_documents/Describing_Simulation_0_codifying_simulations.md` §Integration), API Map (`instruction_documents/Describing_Simulation_0_api_map.md`)
- Workspace: `tools/`, `verifications/`, `workspaces/Describing_Simulation_0/plugins/`, runtime logs captured alongside artifacts
- Done when:
  1. Execute the refreshed `tools/run_integration.sh`, observe the workflow as a first-time user, and iteratively fix any issues in the codebase or script until all integration steps succeed end-to-end.
  2. Capture temperature-control simulation artifacts (e.g., injected system/component source, response logs, evaluation stream snapshots) under `verifications/` with clear filenames.
  3. Record the integration run (commands, environment, notable observations) in a new memory record for future aligner/optimizer phases.
