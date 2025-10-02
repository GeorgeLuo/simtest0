# Simulation API

- `GET /` — Lists available endpoints for the simulation server.
- `POST /commands` — Submit a simulation command `{ id: string, type: string, payload?: object }`; returns an acknowledgement payload.
- `GET /frames/latest` — Retrieve the latest simulation frame (204 when none present).
- `GET /evaluation` — Surface evaluation endpoints and current snapshot catalogue.
- `POST /evaluation/commands` — Submit evaluation commands mirroring the simulation command schema.
- `GET /evaluation/frames/latest` — Retrieve latest evaluation frame.
- `GET /evaluation/snapshots` — List persisted evaluation snapshot names.
- `POST /evaluation/snapshots` — Persist the latest evaluation frame under an optional name `{ name?: string }`.
- `GET /evaluation/snapshot?name=<id>` — Fetch a specific evaluation snapshot payload.
- `POST /evaluation/snapshot/load` — Request loading a stored snapshot `{ name?: string }`; defaults to query parameter `name` when body omitted.
- `GET /codebase?dir=<path>` — List repository entries (files/directories with metadata) beneath an optional directory.
- `GET /codebase/file?path=<file>` — Retrieve file content and size for an in-repo path.
