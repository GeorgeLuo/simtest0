# HTTP Integration Workflow

The scripted integration run must exercise the public API exactly as described in Phase 3. The following sequence assumes the server is listening on `http://127.0.0.1:PORT`.

1. **Boot & Health**
   - Start the server.
   - `GET /` → assert 200 and presence of `commands`, `frames/latest`, `evaluation` endpoints.

2. **Simulation Command Validation**
   - Malformed request: `POST /commands` with `{ "type": "start" }` → expect 400 with error payload.
   - Valid start: `POST /commands` with `{ "id": "sim-start", "type": "start" }` → expect ack status `ok`.
   - Inject system: `POST /commands` with payload `{ id: "sim-inject", type: "inject", payload: { factorySource: <source>, position: 0 } }` once injection endpoint is implemented; until then use a placeholder command to match spec.
   - Pause/resume: issue `pause`/`start` commands and confirm ack.

3. **Frame Observation**
   - `GET /frames/latest` repeatedly (e.g., every 200 ms for five iterations) → capture ticks showing monotonic increase; store responses.

4. **Evaluation Player Flow**
   - `POST /evaluation/commands` with `{ id: "eval-start", type: "start" }` → expect ack `ok`.
   - `POST /evaluation/snapshots` with `{ name: "integration" }` → expect success.
   - `GET /evaluation/snapshot?name=integration` → capture snapshot payload.
   - `POST /evaluation/snapshot/load` with same name → expect success.
   - Optional: issue evaluation-specific inject commands once supported.

5. **Error Handling**
   - `POST /evaluation/commands` with missing id → expect 400.
   - `GET /codebase/file?path=/etc/passwd` → expect 404/400 (path outside repo).

6. **Artifact Capture**
   - Log every request/response (status, body) in chronological order.
   - Save sampled frames, evaluation snapshot, and final state into `verifications/<timestamp>/`.
   - Record command list, ack statuses, and any errors in a summary JSON/Markdown.

7. **Cleanup**
   - Stop the server.

[ ] Expand once system injection endpoint is fully implemented for dynamic code.
