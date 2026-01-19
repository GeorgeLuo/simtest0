# Task Record — Ways audit (implementer)

## Summary
- Audited existing ways memories for currency and added new ways to cover the CLI/dev tools split, updated verification paths, and plugin upload restrictions.

## Findings
- `memory/ways/verification_layers_for_change_management.md` is stale because tooling moved under `tools/dev/`; a new ways file now supersedes it.
- `api_surface_contracts.md`, `plugin_runtime_notes.md`, `simulation_frame_integrity.md`, and `system_routes_status.md` still match current behavior.
- Added coverage for the CLI/dev split and plugin upload constraints, which were not previously captured in ways.

## Actions
- Added `memory/ways/cli_dev_tools_split.md`.
- Added `memory/ways/verification_layers_for_change_management_dev_tools.md`.
- Added `memory/ways/plugin_upload_constraints.md`.

## Validation
- Not run (documentation-only change).

## Done-ness Evaluation
- Ways audit complete; new guidance captures current tooling layout and runtime constraints.
