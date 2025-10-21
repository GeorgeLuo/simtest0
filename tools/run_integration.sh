#!/usr/bin/env bash
set -euo pipefail

# Step mapping from Integration instructions:
# 1. Build & Start Service
# 2. Learn Usage
# 3. Validate State Before Start of Simulation
# 4. Inject Valid Systems and Components
# 5. Start of Simulation
# 6. Validate Behavior

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_DIR="$ROOT_DIR/workspaces/Describing_Simulation_0"
VERIFICATIONS_DIR="$ROOT_DIR/verifications"
TIMESTAMP="$(date +%Y%m%dT%H%M%S)"
RUN_DIR="$VERIFICATIONS_DIR/integration_$TIMESTAMP"
RESPONSES_DIR="$RUN_DIR/responses"
LOG_FILE="$RUN_DIR/integration.log"
SERVER_LOG="$RUN_DIR/server.log"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

mkdir -p "$RESPONSES_DIR"
: >"$LOG_FILE"

log() {
  if [ "$#" -eq 0 ]; then
    printf '\n' | tee -a "$LOG_FILE" >/dev/null
  else
    printf '%s\n' "$*" | tee -a "$LOG_FILE" >/dev/null
  fi
}

log_step() {
  log
  log "=== $1 ==="
}

SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    log "Stopping sim-eval server (pid $SERVER_PID)"
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

wait_for_server() {
  local attempt=0
  until curl --silent --show-error --fail "$BASE_URL/health" >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then
      log "Server did not become healthy after 30 attempts; see $SERVER_LOG"
      exit 1
    fi
    sleep 1
  done
}

assert_status_idle() {
  local status_file="$1"
  python - <<'PY' "$status_file"
import json, sys
from pathlib import Path

data = json.loads(Path(sys.argv[1]).read_text())
simulation = data.get("simulation", {})
evaluation = data.get("evaluation", {})
if simulation.get("running"):
    raise SystemExit("Expected simulation player to be idle before start.")
if evaluation.get("running"):
    raise SystemExit("Expected evaluation player to be idle before start.")
PY
}

assert_ack_success() {
  local response_file="$1"
  python - <<'PY' "$response_file"
import json, sys
from pathlib import Path

data = json.loads(Path(sys.argv[1]).read_text())
ack = data.get("acknowledgement") or {}
if ack.get("status") != "success":
    raise SystemExit(f"Acknowledgement failed: {ack}")
PY
}

assert_simulation_running() {
  local status_file="$1"
  python - <<'PY' "$status_file"
import json, sys
from pathlib import Path

data = json.loads(Path(sys.argv[1]).read_text())
simulation = data.get("simulation", {})
if not simulation.get("running"):
    raise SystemExit("Expected simulation player to be running after start.")
PY
}

assert_sse_event() {
  local event_file="$1"
  python - <<'PY' "$event_file"
from pathlib import Path
import sys

content = Path(sys.argv[1]).read_text()
lines = [line.strip() for line in content.splitlines() if line.strip()]
if not any(line.startswith("data:") for line in lines):
    raise SystemExit("SSE stream did not include a data payload.")
PY
}

log "sim-eval integration run started at $TIMESTAMP"

# Step 1: Build & Start Service
log_step "Build & Start Service"
pushd "$WORKSPACE_DIR" >/dev/null
if [ ! -d node_modules ]; then
  log "Installing dependencies (npm install)"
  npm install >"$RUN_DIR/npm-install.log" 2>&1
else
  log "Dependencies detected; skipping npm install"
fi

log "Compiling TypeScript bundle (npm run build)"
npm run build >"$RUN_DIR/npm-build.log" 2>&1

log "Starting sim-eval server (node --experimental-specifier-resolution=node dist/main.js)"
node --experimental-specifier-resolution=node dist/main.js >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!
popd >/dev/null

wait_for_server
curl --silent --show-error --fail "$BASE_URL/health" >"$RESPONSES_DIR/health.json"
log "Server healthy; health response captured at $RESPONSES_DIR/health.json"

# Step 2: Learn Usage
log_step "Learn Usage"
curl --silent --show-error --fail "$BASE_URL/" >"$RESPONSES_DIR/root.json"
curl --silent --show-error --fail "$BASE_URL/information/api.md" >"$RESPONSES_DIR/api_document.json"
curl --silent --show-error --fail "$BASE_URL/information/Describing_Simulation.md" >"$RESPONSES_DIR/describing_simulation.json"
log "Captured root discovery payload and documentation under $RESPONSES_DIR"

# Step 3: Validate State Before Start of Simulation
log_step "Validate State Before Start of Simulation"
curl --silent --show-error --fail "$BASE_URL/status" >"$RESPONSES_DIR/status_before.json"
assert_status_idle "$RESPONSES_DIR/status_before.json"
log "Status confirms both players are idle"

# Step 4: Inject Valid Systems and Components
log_step "Inject Valid Systems and Components"
SYSTEM_PLUGIN_FILE="$RUN_DIR/TemperatureControlSystem.ts"
cat <<'TS' >"$SYSTEM_PLUGIN_FILE"
// TemperatureControlSystem plugin stub demonstrating runtime extension.
export class TemperatureControlSystem {
  constructor(private readonly targetCelsius: number = 22) {}

  private current = this.targetCelsius;

  onInit(): void {
    // Initialize telemetry buffers or external connections here.
  }

  update(): void {
    // Drift current temperature half-way toward the target set point.
    const delta = this.targetCelsius - this.current;
    this.current += delta * 0.5;
  }

  onDestroy(): void {
    // Release resources such as file handles or sockets.
  }
}
TS

COMPONENT_PLUGIN_FILE="$RUN_DIR/ThermostatComponent.ts"
cat <<'TS' >"$COMPONENT_PLUGIN_FILE"
// ThermostatComponent defines the payload tracked on entities.
export interface ThermostatComponent {
  setPointCelsius: number;
  measuredCelsius: number;
}

export const DEFAULT_THERMOSTAT_COMPONENT: ThermostatComponent = {
  setPointCelsius: 22,
  measuredCelsius: 20,
};
TS

python - <<'PY' "$SYSTEM_PLUGIN_FILE" "$RUN_DIR/plugin_system_request.json"
import json, sys
from pathlib import Path
source_path, request_path = sys.argv[1], sys.argv[2]
payload = {
    "path": "simulation/systems/TemperatureControlSystem.ts",
    "content": Path(source_path).read_text(),
}
Path(request_path).write_text(json.dumps(payload))
PY

python - <<'PY' "$COMPONENT_PLUGIN_FILE" "$RUN_DIR/plugin_component_request.json"
import json, sys
from pathlib import Path
source_path, request_path = sys.argv[1], sys.argv[2]
payload = {
    "path": "simulation/components/ThermostatComponent.ts",
    "content": Path(source_path).read_text(),
}
Path(request_path).write_text(json.dumps(payload))
PY

curl --silent --show-error --fail \
  -H "content-type: application/json" \
  --data @"$RUN_DIR/plugin_system_request.json" \
  "$BASE_URL/codebase/plugin" >"$RESPONSES_DIR/plugin_system.json"

curl --silent --show-error --fail \
  -H "content-type: application/json" \
  --data @"$RUN_DIR/plugin_component_request.json" \
  "$BASE_URL/codebase/plugin" >"$RESPONSES_DIR/plugin_component.json"

curl --silent --show-error --fail "$BASE_URL/codebase/tree" >"$RESPONSES_DIR/codebase_tree.json"
curl --silent --show-error --fail \
  "$BASE_URL/codebase/file?path=plugins/simulation/systems/TemperatureControlSystem.ts" \
  >"$RESPONSES_DIR/plugin_system_file.json"

log "Plugin uploads accepted; repository snapshot stored at $RESPONSES_DIR/codebase_tree.json"

# Step 5: Start of Simulation
log_step "Start of Simulation"
curl --silent --show-error --fail \
  -H "content-type: application/json" \
  --data '{}' \
  "$BASE_URL/simulation/start" >"$RESPONSES_DIR/simulation_start.json"
assert_ack_success "$RESPONSES_DIR/simulation_start.json"
log "Simulation start acknowledged successfully"

# Step 6: Validate Behavior
log_step "Validate Behavior"
SSE_OUTPUT="$RUN_DIR/evaluation_stream.event"
SSE_URL="$BASE_URL/evaluation/stream"
SSE_TIMEOUT_MS=10000 SSE_URL="$SSE_URL" SSE_OUTPUT="$SSE_OUTPUT" node <<'NODE' &
const fs = require("node:fs");
const http = require("node:http");

const url = process.env.SSE_URL;
const output = process.env.SSE_OUTPUT || "evaluation_stream.event";
const timeoutMs = Number.parseInt(process.env.SSE_TIMEOUT_MS || "10000", 10);

if (!url) {
  console.error("SSE_URL environment variable is required.");
  process.exit(1);
}

let buffer = "";
const chunks = [];

const request = http.get(url, (response) => {
  response.setEncoding("utf8");
  response.on("data", (chunk) => {
    chunks.push(chunk);
    buffer += chunk;
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    for (const event of events) {
      if (!event.trim()) {
        continue;
      }
      const lines = event.split("\n");
      if (lines.some((line) => line.startsWith("data:"))) {
        fs.writeFileSync(output, `${event}\n\n`, "utf8");
        clearTimeout(timer);
        process.exit(0);
      }
    }
  });
  response.on("end", () => {
    fs.writeFileSync(output, chunks.join("") + buffer, "utf8");
    console.error("SSE stream ended before a data payload was received.");
    process.exit(1);
  });
});

request.on("error", (error) => {
  const code = error && error.code;
  if (code === "ECONNRESET" || code === "ERR_STREAM_DESTROYED") {
    return;
  }
  fs.writeFileSync(output, chunks.join("") + buffer, "utf8");
  console.error(error.message || String(error));
  process.exit(1);
});

const timer = setTimeout(() => {
  fs.writeFileSync(output, chunks.join("") + buffer, "utf8");
  console.error("Timed out waiting for SSE data.");
  process.exit(1);
}, timeoutMs);

if (typeof timer.unref === "function") {
  timer.unref();
}
NODE
SSE_PID=$!
sleep 1

cat <<'JSON' >"$RUN_DIR/evaluation_frame_request.json"
{
  "frame": {
    "tick": 1,
    "entities": [
      {
        "id": "temperature-zone-1",
        "components": [
          {
            "type": "temperature.sensor",
            "data": { "celsius": 21.5 }
          },
          {
            "type": "thermostat.state",
            "data": {
              "setPointCelsius": 22,
              "measuredCelsius": 21.5
            }
          }
        ]
      }
    ]
  }
}
JSON

curl --silent --show-error --fail \
  -H "content-type: application/json" \
  --data @"$RUN_DIR/evaluation_frame_request.json" \
  "$BASE_URL/evaluation/frame" >"$RESPONSES_DIR/evaluation_frame_ack.json"
assert_ack_success "$RESPONSES_DIR/evaluation_frame_ack.json"

wait "$SSE_PID"
assert_sse_event "$SSE_OUTPUT"
log "Evaluation stream produced an SSE payload captured at $SSE_OUTPUT"

curl --silent --show-error --fail "$BASE_URL/status" >"$RESPONSES_DIR/status_after.json"
assert_simulation_running "$RESPONSES_DIR/status_after.json"
log "Post-start status confirms simulation player is running"

log
log "Integration workflow complete. Artifacts recorded under $RUN_DIR"
