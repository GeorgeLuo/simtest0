# Phase 4 integration walkthrough (outsider)

## Discoverability
- `./tools/start.sh` launched the service without prior build; recorded artifacts in `verifications/simeval_start_20251028T174201Z.(log|pid)`.
- Root `GET /` returned `404` with no guidance; `GET /api` exposed the expected metadata (segments + document links). Consider linking the root to `/api` for quicker orientation.
- `/api/information/api` concisely documented request/response shapes and surfaced the codebase browsing endpoints.

## Simulation flow
- Browsed sample assets via `/api/codebase/tree` and fetched `plugins/simulation/systems/temperatureControlSystem.js`.
- Injected system: `POST /api/simulation/inject` with `modulePath` + `exportName` responded `200` and supplied `systemId`.
- Playback verified:
  - `POST /api/simulation/start` returned success.
  - `/api/simulation/stream` emitted alternating heater/temperature frames every tick (captured curling window ~ticks 106–203 before timeout).
  - `POST /api/simulation/pause` halted events; subsequent stream call delivered no data within 3s.
  - `POST /api/simulation/stop` + `/api/simulation/eject` acknowledged cleanly when finished.

## Observations
- Streaming endpoint is verbose (~90 events in five seconds); consider optional query parameters (limit/window) or heartbeat cadence guidance.
- Error handling behaved as expected (timeouts only from client-side curl limit). No auth or rate limiting in place, so responses were immediate.
- Suggest homepage redirect or basic discovery payload at `/` to align with outsider expectations from the API overview.

Server stopped via recorded PID after validation.
