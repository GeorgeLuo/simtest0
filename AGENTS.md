# Contributor Guidance

## Orientation
- Read `index.md` for a quick summary of the repository's intent and active directories.
- Study `Describing_Simulation_0.md` before implementing features; it encodes the philosophy, task staging, and the test-driven
  sequence expected of all changes.

## Development Pattern
1. Outline structural skeletons for new modules or documents.
2. Capture test intents as comments or prose describing verification goals.
3. Translate those intents into executable tests.
4. Implement the logic needed to satisfy the tests.
5. Run the verification harness and iterate until it passes without regressions.

## Repository Structure Expectations
- When beginning substantive implementation work, create the `tools/`, `workspaces/`, and `memory/` directories if they are
  absent, following the layout described in the master document.
- Place active development inside an appropriate workspace directory (e.g., `workspaces/<instruction_revision>/`).
- Record long-term assumptions in `memory/ways/` and short-term progress notes in timestamped files under `memory/records/`.

## Testing and Verification
- Keep a root-level `checks.sh` script as the canonical entry point for automated validation.
- Run `./checks.sh` (or the relevant subset if you expand it) before committing changes, and capture outputs in
  `verifications/<timestamp>.log` for traceability.
- Extend `checks.sh` whenever new tooling or tests are added so contributors have a single command to validate work.

## Documentation Hygiene
- Update `index.md`, `AGENTS.md`, and any instruction indices when the directory layout or development practices evolve.
- Surface new engine orchestration or messaging interfaces (for example, Player loops and IO buses) in `index.md` and `instruction_documents/index.md` so contributors can quickly locate control-path documentation.
- Use clear, dated commit messages and reference the relevant records in `memory/` when adding or modifying instruction
  artifacts.

Adhering to these patterns keeps the repository aligned with its documentation-first workflow and ensures future contributors
can follow the trace of each implementation decision.
