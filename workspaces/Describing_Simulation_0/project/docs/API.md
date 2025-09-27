# Simulation Service API

This document describes the HTTP API that wraps the simulation and evaluation players.  All
endpoints are served from the same origin as the Node.js server created by `createServer` in
`src/server.ts`.

The service only accepts and returns JSON unless otherwise noted.  Clients should set
`Accept: application/json` on requests that expect JSON responses.

## Health & State

### `GET /info`

Returns the current playback state for the simulation and evaluation subsystems.

#### Response

- `200 OK` – body:
  ```json
  {
    "simulation": { "state": "idle" | "running" | "paused" },
    "evaluation": { "state": "idle" | "running" | "paused" }
  }
  ```

## Simulation Control

### `POST /simulation/playback`

Issues a playback command to the simulation player.

#### Request

- Headers: `Content-Type: application/json`
- Body:
  ```json
  { "command": "start" | "resume" | "pause" | "stop" }
  ```

#### Responses

- `200 OK` – the command was acknowledged by at least one handler.  Body:
  ```json
  {
    "acknowledged": true,
    "deliveries": number,
    "state": "idle" | "running" | "paused"
  }
  ```
- `202 Accepted` – the command was delivered but not acknowledged.  Body:
  ```json
  {
    "acknowledged": false,
    "deliveries": number
  }
  ```
- `400 Bad Request` – the payload is missing or includes an unsupported command.  Body:
  ```json
  { "error": string }
  ```

## Simulation System Uploads

### `POST /simulation/systems`

Uploads a serialized simulation system to be injected at runtime.

#### Request

- Body: raw bytes forwarded to the configured `SimulationSystemUploadHandler`.
- Headers: forwarded without modification.  If `Content-Type` includes
  `application/json`, the body is parsed and provided as `json` alongside the raw
  buffer.

#### Responses

- `201 Created` – the upload handler returned a system and the command bus acknowledged the
  injection.
  ```json
  {
    "acknowledged": true,
    "deliveries": number
  }
  ```
- `202 Accepted` – the command was delivered but not acknowledged by any handler.
  ```json
  {
    "acknowledged": false,
    "deliveries": number
  }
  ```
- `400 Bad Request` – the upload handler rejected the payload or failed to return a system.
  ```json
  { "error": string }
  ```
- `501 Not Implemented` – no upload handler is registered on the server.
  ```json
  { "error": "System uploads are not supported." }
  ```

## Event Streams

All stream endpoints use Server-Sent Events (SSE).  Clients should set `Accept: text/event-stream`
and keep the connection open to receive push updates.

### `GET /simulation/stream`

Subscribes to outbound frames emitted by the simulation bus.  The server writes `data: <frame>`
JSON payloads as they are published.

### `GET /evaluation/stream`

Subscribes to outbound frames emitted by the evaluation bus.  Frames are forwarded from the
simulation outbound bus to the evaluation inbound bus and then streamed to connected clients.
