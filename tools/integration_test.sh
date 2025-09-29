#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE="$ROOT_DIR/workspaces/Describing_Simulation_0"
PORT="${PORT:-4700}"
LOG_DIR="$ROOT_DIR/verifications"
SERVER_LOG="$LOG_DIR/sim_eval_server.log"

mkdir -p "$LOG_DIR"

if [[ ! -d "$WORKSPACE/node_modules" ]]; then
  npm install --prefix "$WORKSPACE"
fi

PORT="$PORT" npm start --prefix "$WORKSPACE" >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

READY=0
for _ in {1..60}; do
  if curl -fs "http://127.0.0.1:$PORT/info" > /dev/null; then
    READY=1
    break
  fi
  sleep 0.5
done

if [[ $READY -ne 1 ]]; then
  echo "Server did not become ready" >&2
  exit 1
fi

post_json() {
  local path="$1"
  local payload="$2"
  curl -fsS -X POST -H 'Content-Type: application/json' --data "$payload" "http://127.0.0.1:$PORT$path"
}

post_json "/simulation/start" '{}'
post_json "/simulation/systems" '{"systemId":"sim_metric","componentId":"simulation.metric"}'

sleep 1
SIM_STREAM=$(curl -sN --max-time 5 "http://127.0.0.1:$PORT/simulation/events")
if [[ "$SIM_STREAM" != *"simulation.metric"* ]]; then
  echo "Simulation event stream missing injected component" >&2
  exit 1
fi

post_json "/evaluation/systems" '{"systemId":"eval_metric","componentId":"evaluation.metric"}'

sleep 1
EVAL_STREAM=$(curl -sN --max-time 5 "http://127.0.0.1:$PORT/evaluation/events")
if [[ "$EVAL_STREAM" != *"evaluation.metric"* ]]; then
  echo "Evaluation event stream missing injected component" >&2
  exit 1
fi

FRAMES_JSON=$(curl -fsS "http://127.0.0.1:$PORT/evaluation/frames")
if [[ "$FRAMES_JSON" != *"frames"* ]]; then
  echo "Evaluation frames endpoint did not return frames" >&2
  exit 1
fi

echo "Integration test succeeded"
