# SimEval API Overview

This document summarizes the HTTP interface exposed by the simulation-evaluation service. Consult the instruction documents in the repository root for deeper architectural guidance.

## Segments
- `/api/simulation` — Control simulation playback, inject or eject systems, and consume outbound frames via Server-Sent Events (`/api/simulation/stream`).
- `/api/evaluation` — Inject evaluation systems/components, feed frames, and subscribe to evaluation output via Server-Sent Events (`/api/evaluation/stream`).
- `/api/codebase` — Inspect the project filesystem (`/api/codebase/tree`) and read source files (`/api/codebase/file`) to support plugin authoring.

## Simulation Control
- `POST /api/simulation/start` — Begin advancing the simulation loop.
- `POST /api/simulation/pause` — Temporarily halt cycle execution without tearing down state.
- `POST /api/simulation/stop` — Halt execution and clear active timers.
- `POST /api/simulation/inject` — Provide a serialized system for runtime registration.
- `POST /api/simulation/eject` — Remove a previously injected system.
- `GET  /api/simulation/stream` — Stream outbound frames and acknowledgements in real time.

## Evaluation Interface
- `POST /api/evaluation/frame` — Inject a frame record for evaluation processing.
- `POST /api/evaluation/system/inject` — Load an evaluation system module and register it with the player.
- `POST /api/evaluation/system/eject` — Remove a previously injected evaluation system.
- `POST /api/evaluation/component/inject` — Register an evaluation component type for downstream systems.
- `POST /api/evaluation/component/eject` — Remove a registered evaluation component type.
- `GET  /api/evaluation/stream` — Stream evaluation acknowledgements and derived frames.

## Codebase Inspection
- `GET /api/codebase/tree?path=<relative>` — List files and directories relative to the repository root.
- `GET /api/codebase/file?path=<relative>` — Retrieve UTF-8 file contents.

## Notes
- All mutation endpoints accept JSON request bodies with a `messageId` to correlate responses.
- Success responses return `{ status: "success", messageId }`; additional error messaging will be surfaced with `status: "error"` once implemented.
- SSE endpoints emit JSON-encoded payloads separated by blank lines per the Server-Sent Events specification.
