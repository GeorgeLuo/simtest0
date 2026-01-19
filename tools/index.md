# Tools Directory

This directory houses scripts that support the simulation workspace.

## CLI (user experience)
- `cli/cli_config.js` — shared config loader for the CLI and Morphcloud distributor.
- `cli/simeval_cli.js` — CLI for uploading plugins, controlling playback, capturing/forwarding/uploading streams, driving the Metrics UI, exploring the codebase, waiting on state, managing deployments (optionally cleaning plugins), organizing local run metadata, and scaffolding/running Morphcloud fleet configs.
- `cli/morphcloud_distributor.js` — fleet wrapper for Morphcloud: provisions multiple SimEval instances, tracks them locally, and dispatches simeval_cli/validator commands across the fleet.
- `cli/morphcloud_validator.js` — post-provision check for hosted SimEval instances; uploads validator plugins, injects them, verifies simulation/evaluation SSE output, and cleans up.
- `cli/morphcloud_clone_snapshot.js` — boots a fresh Morphcloud instance from a ready-made SimEval snapshot and exposes the HTTP endpoint, printing the new server URL.
- `cli/morphcloud_build_instance.sh` — provisions a Morphcloud VM from a snapshot, installs the workspace, runs tests, configures systemd, and (optionally) exposes the SimEval API.

## Dev tools
- `dev/start.sh` — launches the SimEval server from `workspaces/Describing_Simulation_0` in the background and records logs/PIDs in `verifications/`.
- `dev/run_integration.sh` — orchestrates the Phase 3 integration flow (build workspace, execute automation).
- `dev/run_integration.js` — node-based automation that starts the service, verifies the API landing page, confirms idle SSE behaviour, injects the temperature control system, and exercises playback controls.
- `dev/benchmark_simulation.js` — Phase 5 harness that starts the compiled workspace, advances 500+ ticks, measures runtime/memory metrics, and records baseline artifacts under `verifications/`.
- `dev/capture_eval_sample.sh` — captures a small evaluation stream sample after staging bundled plugins.
- `dev/clear_plugins.js` — clears plugin files under a workspace without removing directory scaffolding.
- `dev/component_stream_filter.js` — connects to a simulation or evaluation SSE endpoint, filters frames by component id, and streams the matching component payloads for quick inspection.

All usage patterns should remain consistent with guidance in `instruction_documents/Describing_Simulation_0_simeval_codifying_simulations.md` derived from `Describing_Simulation_0.md`.
