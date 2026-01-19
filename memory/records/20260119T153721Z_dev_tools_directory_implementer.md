# Task Record — Dev tools directory split (implementer)

## Summary
- Reorganized tooling into `tools/cli/` (user-facing CLI) and `tools/dev/` (developer scripts), updating references and root-path assumptions.
- Updated extracted instruction docs and workspace README to match the new dev tool paths.

## Actions
- Moved dev scripts into `tools/dev/` (`start.sh`, `run_integration.*`, `benchmark_simulation.js`, `capture_eval_sample.sh`, `clear_plugins.js`, `component_stream_filter.js`) and adjusted their root/path references.
- Updated `README.md`, `tools/index.md`, and `workspaces/Describing_Simulation_0/README.md` to point at `tools/dev/...`.
- Updated extracted instruction documents to reflect the new tools layout; logged a tools layout exception for the unchanged source manuscript.

## Validation
- Not run (file moves and doc/path updates only).

## Done-ness Evaluation
- Tooling now cleanly split between CLI and dev helpers; memory/ways still reference old paths and should be treated as historical.
