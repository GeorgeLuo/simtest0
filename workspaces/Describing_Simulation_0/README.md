# Describing_Simulation_0 Workspace

Artifacts for Phase 2 — Artifact Creation live here. Follow the schedule outlined in `instruction_documents/Describing_Simulation_0_simeval_schedule_of_work.md` when populating this workspace.

## Environment Setup

- Local TypeScript toolchain configured via `package.json` and `tsconfig.json`; see scripts for `npm run build`, `npm run test`, and `npm run start`.
- Jest with `ts-jest` is prepared for the TDD flow described in `instruction_documents/Describing_Simulation_0_simeval_implementation_guidelines.md`.
- Source files live under `src/`, beginning with `core/entity` and `core/components` as defined in `instruction_documents/Describing_Simulation_0_simeval_codifying_simulations.md`.
- Launch the SimEval server locally with `npm run start`; the CLI logs the listening host and port once ready.
- From the repository root, `./tools/start.sh` installs dependencies if needed, starts the server in the background, and records log/PID files under `verifications/` for quick bring-up.
- Programmatic consumers may pass `cycleIntervalMs` to `start(...)` to adjust tick pacing (default `50` ms; set to `0` in benchmarking tools for fast-cycle runs).
- Visit `http://<host>:<port>/api` after launch to review discoverability metadata and documentation links. The landing payload links to JSON-rendered copies of `routes/information/api.md` and `routes/information/Describing_Simulation.md`.
- Retain the `systemId` returned from `/api/(simulation|evaluation)/system/inject` calls; subsequent eject requests now require this identifier.
- Set `SIMEVAL_AUTH_TOKEN` to require clients to supply a matching `Authorization` header (`Bearer <token>` is accepted); omit the variable to leave the API unsecured for local development.
- Configure optional rate limiting with `SIMEVAL_RATE_WINDOW_MS` (milliseconds) and `SIMEVAL_RATE_MAX` (requests per window). Leave unset to disable throttling.

## Next Steps

- Follow the latest task queues in `memory/records/` (e.g., Phase 3 and 4 files) to understand ongoing objectives; new tasks are appended with timestamps.
- Use `./checks.sh` and `./tools/run_integration.sh` prior to recording task completion to ensure workspace parity with the verification log and integration artifacts.
