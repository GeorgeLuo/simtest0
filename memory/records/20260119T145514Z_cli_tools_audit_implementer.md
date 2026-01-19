# Task Record — CLI tools audit (implementer)

## Summary
- Reviewed `tools/` scripts against `tools/simeval_cli.js` to identify redundant entrypoints and gaps where CLI lacks equivalent functionality.
- Flagged scripts that remain required because the CLI shells out to them.

## Actions
- Mapped `tools/start.sh` to `simeval deploy start` (CLI provides native deployment/start with build/log handling).
- Confirmed `simeval_cli.js` implements stream capture/forward/upload with component/entity filters, run record, deploy management, codebase browsing, and UI control.
- Noted scripts that are only partially covered (e.g., `clear_plugins.js`, `component_stream_filter.js`, `capture_eval_sample.sh`) or not covered at all (`run_integration.*`, `benchmark_simulation.js`).
- Verified Morphcloud scripts (`morphcloud_distributor.js`, `morphcloud_clone_snapshot.js`, `morphcloud_build_instance.sh`, `morphcloud_validator.js`) are still invoked by the CLI and cannot be removed without refactoring.

## Validation
- Not run (analysis-only task).

## Done-ness Evaluation
- Audit complete for current repo state; ready to delete redundant scripts or extend CLI to cover remaining gaps.
