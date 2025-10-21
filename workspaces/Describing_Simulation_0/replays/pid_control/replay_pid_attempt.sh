#!/usr/bin/env bash

set -euo pipefail

HOST="${HOST:-http://localhost:3000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

timestamp="$(date "+run-%Y%m%d-%H%M%S")"
DEFAULT_OUTPUT_DIR="${SCRIPT_DIR}/${timestamp}"
OUTPUT_DIR_INPUT="${1:-$DEFAULT_OUTPUT_DIR}"
mkdir -p "$OUTPUT_DIR_INPUT"
OUTPUT_DIR="$(cd "$OUTPUT_DIR_INPUT" && pwd)"

LOG_FILE="${OUTPUT_DIR}/replay.log"
NOTES_FILE="${OUTPUT_DIR}/notes.txt"

PID_PLUGIN_PAYLOAD=$(cat <<'JSON'
{
  "path": "simulation/systems/PIDControlSystem.js",
  "content": "export class PIDControlSystem { constructor({kp = 1, ki = 0, kd = 0} = {}) { this.kp = kp; this.ki = ki; this.kd = kd; this.integral = 0; this.prevError = 0; } onInit() {} update() {} onDestroy() {} }"
}
JSON
)

iso_timestamp() {
  date -u "+%Y-%m-%dT%H:%M:%SZ"
}

run_cmd() {
  local label="$1"
  shift
  local -a cmd=("$@")

  {
    printf '\n## %s\n$' "$label"
    printf ' %q' "${cmd[@]}"
    printf '\n'
    "${cmd[@]}"
    printf '\n'
  } | tee -a "$LOG_FILE"
}

run_cmd_allow_failure() {
  local label="$1"
  shift
  local -a cmd=("$@")

  {
    printf '\n## %s\n$' "$label"
    printf ' %q' "${cmd[@]}"
    printf '\n'
    set +e
    "${cmd[@]}"
    exit_code=$?
    set -e
    printf '\n# exit status: %s\n' "$exit_code"
  } | tee -a "$LOG_FILE"
}

cat >"$NOTES_FILE" <<'NOTES'
Replay observations (update after review):
- 
NOTES

echo "# PID control replay started at $(iso_timestamp)" | tee -a "$LOG_FILE"

run_cmd "Start simulation" \
  curl -sS -i -X POST "${HOST}/simulation/start" \
    -H 'Content-Type: application/json' \
    --data-binary '{}'

run_cmd "Check status after start" \
  curl -sS "${HOST}/status"

run_cmd_allow_failure "Sample simulation stream (5s timeout)" \
  curl -sS --max-time 5 -N "${HOST}/simulation/stream"

run_cmd "Upload PID control plugin" \
  curl -sS -i -X POST "${HOST}/codebase/plugin" \
    -H 'Content-Type: application/json' \
    --data-binary "${PID_PLUGIN_PAYLOAD}"

run_cmd "Attempt to inject PID system" \
  curl -sS -i -X POST "${HOST}/simulation/system" \
    -H 'Content-Type: application/json' \
    --data-binary '{"id":"pid","module":"simulation/systems/PIDControlSystem.js"}'

run_cmd "Check status after injection attempt" \
  curl -sS "${HOST}/status"

run_cmd "Stop simulation" \
  curl -sS -i -X POST "${HOST}/simulation/stop" \
    -H 'Content-Type: application/json' \
    --data-binary '{}'

echo "# Replay finished at $(iso_timestamp)" | tee -a "$LOG_FILE"

echo

echo "Logs available at: ${LOG_FILE}"
echo "Notes recorded at: ${NOTES_FILE}"
