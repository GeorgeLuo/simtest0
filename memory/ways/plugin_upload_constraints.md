# Plugin Upload Constraints

Runtime plugin uploads are intentionally constrained to avoid arbitrary file writes.

- `/codebase/plugin` only accepts paths under `plugins/` and normalizes them with POSIX semantics; path traversal is rejected.
- Allowed targets are limited to `plugins/simulation/systems`, `plugins/simulation/components`, `plugins/evaluation/systems`, and `plugins/evaluation/components`.
- Operations directories are not valid upload destinations.
- The server does not create missing directories; clients must ensure the plugin directory scaffolding exists before upload.

These constraints keep runtime uploads aligned with the scaffold and match current server enforcement in `workspaces/Describing_Simulation_0/src/routes/codebase.ts` and `workspaces/Describing_Simulation_0/src/main.ts`.
