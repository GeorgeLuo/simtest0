#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_DIR="$ROOT_DIR/workspaces/Describing_Simulation_0"
LOG_FILE="$ROOT_DIR/tmp_manual_server.log"
PID_FILE="$ROOT_DIR/tmp_manual_server.pid"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
NODE_BIN="${NODE_BIN:-node}"
NODE_ARGS="${NODE_ARGS:---experimental-specifier-resolution=node}"

# shellcheck disable=SC2206
NODE_FLAGS=($NODE_ARGS)

usage() {
  cat <<'USAGE'
Usage: tools/start.sh [command]

Commands:
  start   Build (if necessary) and launch the sim-eval server in the background (default)
  stop    Stop a previously launched server instance
  status  Print whether a managed server instance is running
  help    Show this message

Environment variables:
  BASE_URL   Base URL for health probing (default: http://127.0.0.1:3000)
  NODE_BIN   Node executable to use (default: node)
  NODE_ARGS  Additional arguments passed to Node when starting the server
USAGE
}

require_command() {
  local binary="$1"
  if ! command -v "$binary" >/dev/null 2>&1; then
    echo "Error: required command '$binary' not found in PATH" >&2
    exit 1
  fi
}

read_pid() {
  if [[ -f "$PID_FILE" ]]; then
    cat "$PID_FILE"
  fi
}

is_pid_running() {
  local pid="$1"
  if [[ -z "$pid" ]]; then
    return 1
  fi
  if kill -0 "$pid" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

stop_server() {
  local pid
  pid="$(read_pid || true)"
  if is_pid_running "$pid"; then
    echo "Stopping sim-eval server (pid $pid)"
    kill "$pid" >/dev/null 2>&1 || true
    wait "$pid" 2>/dev/null || true
    echo "Server stopped"
  elif [[ -n "$pid" ]]; then
    echo "Removing stale PID file referencing pid $pid"
  else
    echo "No managed sim-eval server is running"
  fi
  rm -f "$PID_FILE"
}

wait_for_health() {
  local pid="$1"
  local attempts=0
  while true; do
    if curl --silent --show-error --fail "$BASE_URL/health" >/dev/null 2>&1; then
      return 0
    fi
    if ! is_pid_running "$pid"; then
      echo "Server process exited before becoming healthy; see $LOG_FILE" >&2
      return 1
    fi
    attempts=$((attempts + 1))
    if [[ $attempts -ge 30 ]]; then
      echo "Server did not become healthy after 30 attempts; see $LOG_FILE" >&2
      return 1
    fi
    sleep 1
  done
}

start_server() {
  require_command npm
  require_command "$NODE_BIN"
  require_command curl

  if [[ ! -d "$WORKSPACE_DIR" ]]; then
    echo "Error: workspace directory not found at $WORKSPACE_DIR" >&2
    exit 1
  fi

  local existing_pid
  existing_pid="$(read_pid || true)"
  if is_pid_running "$existing_pid"; then
    echo "A sim-eval server is already running under pid $existing_pid; stop it first with 'tools/start.sh stop'" >&2
    exit 1
  fi
  rm -f "$PID_FILE"

  pushd "$WORKSPACE_DIR" >/dev/null
  if curl --silent --show-error --fail "$BASE_URL/health" >/dev/null 2>&1; then
    echo "An HTTP service is already responding at $BASE_URL; aborting launch." >&2
    echo "If this is an old sim-eval instance, stop it manually before retrying." >&2
    exit 1
  fi

  if [[ ! -d node_modules ]]; then
    echo "Installing workspace dependencies (npm install)"
    npm install
  else
    echo "Dependencies already installed; skipping npm install"
  fi

  echo "Building TypeScript sources (npm run build)"
  npm run build

  echo "Launching sim-eval server in background"
  touch "$LOG_FILE"
  {
    printf "\n=== sim-eval launch %s ===\n" "$(date +"%Y-%m-%dT%H:%M:%S%z")"
  } >>"$LOG_FILE"

  "$NODE_BIN" "${NODE_FLAGS[@]}" dist/main.js >>"$LOG_FILE" 2>&1 &
  local server_pid=$!
  disown "$server_pid" 2>/dev/null || true
  popd >/dev/null

  echo "$server_pid" >"$PID_FILE"
  echo "Waiting for health check at $BASE_URL/health"
  if wait_for_health "$server_pid"; then
    echo "Server is running (pid $server_pid)"
    echo "Access the API at $BASE_URL"
    echo "Logs streamed to $LOG_FILE"
    echo "Stop the server with: tools/start.sh stop"
  else
    stop_server >/dev/null 2>&1 || true
    exit 1
  fi
}

print_status() {
  local pid
  pid="$(read_pid || true)"
  if is_pid_running "$pid"; then
    echo "sim-eval server is running (pid $pid)"
    echo "Base URL: $BASE_URL"
    echo "Logs: $LOG_FILE"
  else
    echo "sim-eval server is not running"
  fi
}

main() {
  local action="${1:-start}"
  case "$action" in
    start)
      shift || true
      start_server "$@"
      ;;
    stop)
      stop_server
      ;;
    status)
      print_status
      ;;
    help|-h|--help)
      usage
      ;;
    *)
      echo "Unknown command: $action" >&2
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
