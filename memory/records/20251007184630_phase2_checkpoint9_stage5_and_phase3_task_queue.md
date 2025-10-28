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
