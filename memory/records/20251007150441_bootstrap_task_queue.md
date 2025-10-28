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
