# Task Record — Snapshot Clone CLI

## Summary
- Added `tools/morphcloud_clone_snapshot.js` to boot ready-made SimEval snapshots, wait for readiness, expose the HTTP port, and emit the resulting URL for quick parallel simulations.
- Documented the utility in `tools/index.md`.

## Actions
- Built a Node-based CLI that validates arguments, ensures the `morphcloud` CLI and `MORPH_API_KEY` are present, boots a new instance with metadata, polls for the `ready` status, and exposes the desired port/service name while reporting progress to stderr.
- Added optional flags for disk sizing, metadata, auth mode, polling cadence, and JSON summary output so the tool plays nicely with automation scripts.
- Marked the script executable for consistency with other tools.

## Validation
- Reasoned through the morphcloud invocation flow already proven in `morphcloud_build_instance.sh`; command output parsing mirrors the existing tooling patterns.

## Follow-ups
- None; run `node tools/morphcloud_clone_snapshot.js --snapshot <id>` to create additional SimEval clones.
