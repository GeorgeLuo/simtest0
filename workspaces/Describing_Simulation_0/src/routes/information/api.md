# Sim-Eval HTTP API

> Curated from `instruction_documents/Describing_Simulation_0_api_map.md` and
> `instruction_documents/Describing_Simulation_0_codifying_simulations.md` (Section IX).

The Sim-Eval server exposes a REST surface that lets an operator discover the
simulation, manage runtime assets, stream telemetry, and track service health.
All endpoints accept and emit JSON unless otherwise noted. Successful control
operations return an acknowledgement payload with the following structure:

```json
{
  "acknowledgement": {
    "messageId": "msg-42",
    "status": "success",
    "detail": "operation description"
  }
}
```

When acknowledgements report `"status": "error"` the HTTP status will be `500`
and a `detail` field explains the failure.

## Endpoint Inventory

| # | Method | Path | Purpose |
| - | ------ | ---- | ------- |
| 1 | GET | `/` | Root discovery payload with navigation cues. |
| 2 | GET | `/information/Describing_Simulation.md` | Exposes the descriptive spec served by this file’s companion document. |
| 3 | GET | `/information/api.md` | Returns this API guide. |
| 4 | POST | `/simulation/start` | Start the simulation loop. |
| 5 | POST | `/simulation/pause` | Pause the simulation loop, retaining state. |
| 6 | POST | `/simulation/stop` | Stop and reset the simulation loop. |
| 7 | POST | `/simulation/system` | Inject a simulation system definition at runtime. |
| 8 | DELETE | `/simulation/system/:id` | Eject a simulation system by identifier. |
| 9 | POST | `/simulation/component` | Register a simulation component definition. |
| 10 | DELETE | `/simulation/component/:id` | Remove a simulation component definition. |
| 11 | GET | `/simulation/stream` | Server-Sent Events (SSE) stream of simulation frames. |
| 12 | POST | `/evaluation/frame` | Inject an evaluation frame for analysis. |
| 13 | POST | `/evaluation/system` | Inject an evaluation system definition. |
| 14 | DELETE | `/evaluation/system/:id` | Eject an evaluation system definition. |
| 15 | POST | `/evaluation/component` | Register an evaluation component definition. |
| 16 | DELETE | `/evaluation/component/:id` | Remove an evaluation component definition. |
| 17 | GET | `/evaluation/stream` | SSE stream of evaluation frames. |
| 18 | GET | `/codebase/tree` | Recursive snapshot of the repository directory tree. |
| 19 | GET | `/codebase/file?path=<relative>` | Retrieve file contents relative to the repository root. |
| 20 | POST | `/codebase/plugin` | Upload plugin source into the runtime plugin directory. |
| 21 | GET | `/health` | Lightweight service health probe. |
| 22 | GET | `/status` | Detailed simulation/evaluation runtime status. |

## Endpoint Details

### 1. GET `/` — Discoverability Root

Returns a JSON document listing key routes, including informational markdown,
simulation and evaluation controls, codebase utilities, and health endpoints.
Consumers should read this response first to explore the surface area.

### 2–3. GET `/information/...`

- `/information/Describing_Simulation.md` delivers the descriptive theory of the
  sim-eval environment. Content is sourced from the instruction corpus and
  updated alongside code changes.
- `/information/api.md` returns this API reference. Both informational endpoints
  respond with JSON payloads shaped as `{ "content": "<markdown>" }`.

### 4–11. Simulation Control & Telemetry

The simulation routes publish inbound messages onto the simulation player:

- **POST `/simulation/start`**, **`/pause`**, **`/stop`** send
  `simulation.start`, `simulation.pause`, and `simulation.stop` messages,
  coordinating the lifecycle of the simulation loop.
- **POST `/simulation/system`** and **DELETE `/simulation/system/:id`** manage
  runtime systems. Payloads should include the serialized system definition and,
  for deletions, the `:id` path parameter to identify which system to eject.
- **POST `/simulation/component`** and **DELETE `/simulation/component/:id`**
  register and revoke component definitions. Component payloads typically carry
  a `type` string and an arbitrary `schema` or `defaults` object.
- **GET `/simulation/stream`** upgrades the connection to Server-Sent Events,
  emitting `event: simulation` entries whenever the simulation produces a frame.
  Each message places the serialized frame at the `data:` line. Keep-alive
  comments are emitted every 15 seconds to sustain intermediaries.

All mutation endpoints resolve to acknowledgement payloads. The stream uses the
`text/event-stream` content type and must be consumed with SSE-aware clients.

### 12–17. Evaluation Control & Telemetry

Evaluation routes mirror simulation semantics while targeting the evaluation
player buses:

- **POST `/evaluation/frame`** accepts a JSON frame payload. The evaluation
  player ingests the frame and replays it as outbound frames which surface via
  the SSE stream or downstream analytics.
- System/component injection and ejection follow the same patterns as the
  simulation endpoints, including the acknowledgement envelope.
- **GET `/evaluation/stream`** produces `event: evaluation` SSE entries,
  allowing clients to observe evaluation results with low latency.

### 18–20. Codebase Utilities

- **GET `/codebase/tree`** returns `{ "entries": [...] }`, where entries form a
  recursive tree of `{ name, type, children? }`. This view is used to discover
  project assets before retrieving or uploading files.
- **GET `/codebase/file?path=<relative>`** validates the supplied relative path
  against the repository root before returning `{ "path": "...", "content": "..."
  }`. Requesting paths outside the repository or for missing files yields `400`
  or `404` responses.
- **POST `/codebase/plugin`** writes plugin sources under the runtime plugin
  directory. Payloads require `path` (relative to `plugins/`) and `content`
  fields. Intermediate directories are created automatically. On success the
  route responds with `201` and echoes the accepted `path`.

### 21–22. System Health

- **GET `/health`** supplies a quick probe containing service metadata, route
  registrations, and a timestamp. It is intended for orchestration health checks
  and readiness gates.
- **GET `/status`** returns the runtime status of both simulation and evaluation
  players, including boolean `running` flags and the most recent tick counters.
  Operators should verify player state before and after lifecycle operations to
  ensure commands took effect.

## Error Handling

- `404` indicates that the requested route is not registered or a codebase file
  was not found.
- `400` denotes malformed input (missing query parameters, invalid plugin path).
- `500` accompanies failed acknowledgements or filesystem errors. The response
  payload always includes an `error` message or acknowledgement `detail`.

## Streaming Considerations

- SSE endpoints remain open until the client disconnects. Always close the
  connection explicitly in automation to avoid resource leaks.
- Keep-alive comments ensure compatibility with proxies that time out idle HTTP
  connections. Clients should ignore comment lines beginning with `:`.
- Each frame message contains the serialized frame object produced by the
  corresponding player. Consumers may parse JSON from the `data:` segment.

## Authentication & Headers

The reference implementation does not enforce authentication. Operators are
expected to run the service within a controlled environment. All JSON requests
should supply `Content-Type: application/json`; responses inherit that header
automatically for structured payloads.

## Related Documentation

- Descriptive theory: `/information/Describing_Simulation.md`
- Integration workflow: `tools/run_integration.sh`
- Instruction sources: `instruction_documents/Describing_Simulation_0_api_map.md`,
  `instruction_documents/Describing_Simulation_0_codifying_simulations.md`
