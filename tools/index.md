# Tooling Catalog

This catalog lists automation helpers, scripts, and integrations available to support simulation work. Future updates should expand each entry with usage details and configuration notes.

## `run_project_tests.sh`
- Location: `tools/run_project_tests.sh`
- Purpose: Executes the Node + TypeScript test suite for the Describing Simulation 0 project.
- Usage: Run from the repository root with `./tools/run_project_tests.sh`. The script ensures it operates from the workspace project directory and invokes `npm test -- --runInBand`.
