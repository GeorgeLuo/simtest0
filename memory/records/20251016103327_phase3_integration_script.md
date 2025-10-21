# Phase 3 Integration – Script Implementation

- Replaced `tools/run_integration.sh` with a full integration harness that covers the six prescribed stages: building the TypeScript bundle, starting the server, probing documentation endpoints, staging plugin uploads, starting the simulation, and validating behavior via the evaluation SSE stream.
- Added automated artifact capture (responses, logs, plugin sources, SSE transcript) under `verifications/integration_<timestamp>/` with readiness/acknowledgement assertions enforced through helper Python snippets.
- Implemented a lightweight Node-based SSE listener to block until a `data:` payload is observed while injecting an evaluation frame, guaranteeing the workflow exercises live streaming.
- Updated `tools/index.md` to document the new workflow and its output location, and linted the script with `bash -n` to confirm syntax soundness.
