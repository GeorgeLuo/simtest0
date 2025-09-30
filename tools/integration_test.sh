#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE="$ROOT_DIR/workspaces/Describing_Simulation_0"
PORT="${PORT:-4700}"
LOG_DIR="$ROOT_DIR/verifications"
SERVER_LOG="$LOG_DIR/sim_eval_server.log"
SIM_STREAM_FILE="$LOG_DIR/simulation_stream.ndjson"
EVAL_STREAM_FILE="$LOG_DIR/evaluation_stream.ndjson"
FRAMES_FILE="$LOG_DIR/evaluation_frames.json"

log() { printf '[integration] %s\n' "$1"; }

fail() {
  printf '[integration] ERROR: %s\n' "$1" >&2
  if [[ -f "$SERVER_LOG" ]]; then
    printf '[integration] --- server log tail ---\n' >&2
    tail -n 40 "$SERVER_LOG" >&2 || true
    printf '[integration] -----------------------\n' >&2
  fi
  exit 1
}

mkdir -p "$LOG_DIR"

if [[ ! -d "$WORKSPACE/node_modules" ]]; then
  log "Installing workspace dependencies"
  npm install --prefix "$WORKSPACE" || fail "npm install failed"
fi

log "Building workspace"
npm run build --prefix "$WORKSPACE" || fail "workspace build failed"

log "Starting server on port $PORT"
PORT="$PORT" npm run start:prod --prefix "$WORKSPACE" >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

READY=0
for _ in {1..60}; do
  if curl -fs "http://127.0.0.1:$PORT/info" >/dev/null; then
    READY=1
    break
  fi
  sleep 0.5
done

[[ $READY -eq 1 ]] || fail "Server did not become ready"
log "Server ready"

post_json() {
  local path="$1" payload="$2"
  curl -fsS -H 'Content-Type: application/json' -d "$payload" \
    "http://127.0.0.1:$PORT$path" || fail "POST $path failed"
}

log "Starting simulation"
post_json "/simulation/start" '{}'
post_json "/simulation/systems" '{"systemId":"sim_metric","componentId":"simulation.metric"}'

log "Capturing simulation SSE sample"
: > "$SIM_STREAM_FILE"
curl -sS -N --max-time 5 "http://127.0.0.1:$PORT/simulation/events" \
  > "$SIM_STREAM_FILE" 2>>"$SERVER_LOG" || true
if [[ ! -s "$SIM_STREAM_FILE" ]]; then
  fail "Simulation stream unavailable"
fi
if ! grep -q '"simulation.metric"' "$SIM_STREAM_FILE"; then
  fail "Simulation event stream missing injected component"
fi

log "Injecting evaluation system"
post_json "/evaluation/systems" '{"systemId":"eval_metric","componentId":"evaluation.metric"}'

log "Capturing evaluation SSE sample"
: > "$EVAL_STREAM_FILE"
curl -sS -N --max-time 5 "http://127.0.0.1:$PORT/evaluation/events" \
  > "$EVAL_STREAM_FILE" 2>>"$SERVER_LOG" || true
if [[ ! -s "$EVAL_STREAM_FILE" ]]; then
  fail "Evaluation stream unavailable"
fi
if ! grep -q '"evaluation.metric"' "$EVAL_STREAM_FILE"; then
  fail "Evaluation event stream missing injected component"
fi

log "Fetching evaluation frames"
if ! curl -fsS "http://127.0.0.1:$PORT/evaluation/frames" \
  > "$FRAMES_FILE"; then
  fail "Evaluation frames endpoint unavailable"
fi
if ! grep -q '"frames"' "$FRAMES_FILE"; then
  fail "Evaluation frames endpoint did not return frames"
fi

log "Integration test succeeded"
log "Artifacts:"
log "  - Server log:        $SERVER_LOG"
log "  - Simulation stream: $SIM_STREAM_FILE"
log "  - Evaluation stream: $EVAL_STREAM_FILE"
log "  - Evaluation frames: $FRAMES_FILE"
