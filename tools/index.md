# Tools Directory

This directory houses scripts that support the simulation workspace.

- `run_integration.sh` — orchestrates the Phase 3 integration flow (build workspace, execute automation).
- `run_integration.js` — node-based automation that starts the service, verifies the API landing page, confirms idle SSE behaviour, injects the temperature control system, and exercises playback controls.
- `benchmark_simulation.js` — Phase 5 harness that starts the compiled workspace, advances 500+ ticks, measures runtime/memory metrics, and records baseline artifacts under `verifications/`.

All usage patterns should remain consistent with guidance in `instruction_documents/Describing_Simulation_0_codifying_simulations.md` derived from `Describing_Simulation_0.md`.
