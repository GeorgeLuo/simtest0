#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./checks.sh [--integration]

Runs the Sim-Eval verification workflow:
  1. Clean workspace build (npm run build)
  2. Unit test sweep   (npm test)
  3. Optional integration harness (--integration)

Outputs are captured in verifications/checks_<timestamp>.log.
EOF
}

INCLUDE_INTEGRATION=0

while (($# > 0)); do
  case "$1" in
    --integration)
      INCLUDE_INTEGRATION=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$ROOT_DIR/workspaces/Describing_Simulation_0"
VERIFICATIONS_DIR="$ROOT_DIR/verifications"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="$VERIFICATIONS_DIR/checks_${TIMESTAMP}.log"

mkdir -p "$VERIFICATIONS_DIR"
: >"$LOG_FILE"

log() {
  if [ "$#" -eq 0 ]; then
    printf '\n'
    printf '\n' >>"$LOG_FILE"
  else
    printf '%s\n' "$*"
    printf '%s\n' "$*" >>"$LOG_FILE"
  fi
}

run_step() {
  log
  log "=== $1 ==="
}

quote_command() {
  local formatted=""
  for arg in "$@"; do
    formatted+=$(printf '%q ' "$arg")
  done
  printf '%s' "${formatted% }"
}

run_workspace_step() {
  local description="$1"
  shift
  run_step "$description"
  log "Command: (cd $WORKSPACE_DIR && $(quote_command "$@"))"
  (
    cd "$WORKSPACE_DIR"
    "$@"
  ) 2>&1 | tee -a "$LOG_FILE"
}

run_root_step() {
  local description="$1"
  shift
  run_step "$description"
  log "Command: $(quote_command "$@")"
  "$@" 2>&1 | tee -a "$LOG_FILE"
}

log "Sim-Eval checks started at $TIMESTAMP"

if [ -d "$WORKSPACE_DIR/dist" ]; then
  run_workspace_step "Clean previous build artifacts" rm -rf dist
fi

run_workspace_step "Build TypeScript bundle" npm run build
run_workspace_step "Run unit tests" npm test

if (( INCLUDE_INTEGRATION )); then
  run_root_step "Run integration harness" "$ROOT_DIR/tools/run_integration.sh"
fi

log
log "Checks completed successfully."
log "Log file: $LOG_FILE"
