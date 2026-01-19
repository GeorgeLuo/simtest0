#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
WORKSPACE_DIR="$ROOT_DIR/workspaces/Describing_Simulation_0"
LOG_DIR="$ROOT_DIR/verifications"
DEFAULT_PORT=3000
PORT="${SIMEVAL_PORT:-${1:-$DEFAULT_PORT}}"
HOST="${SIMEVAL_HOST:-localhost}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="$LOG_DIR/simeval_start_${TIMESTAMP}.log"
PID_FILE="$LOG_DIR/simeval_start_${TIMESTAMP}.pid"

mkdir -p "$LOG_DIR"

if [ ! -d "$WORKSPACE_DIR/node_modules" ]; then
  echo "Installing dependencies in $WORKSPACE_DIR"
  npm --prefix "$WORKSPACE_DIR" install >/dev/null
fi

echo "Building TypeScript sources"
npm --prefix "$WORKSPACE_DIR" run build >/dev/null

echo "Starting SimEval server (port $PORT)"
SIMEVAL_PORT="$PORT" SIMEVAL_HOST="$HOST" SIMEVAL_AUTO_START_EVALUATION="true" \
  node "$WORKSPACE_DIR/dist/main.js" >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo "$SERVER_PID" > "$PID_FILE"
sleep 2
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "SimEval server failed to start. Inspect $LOG_FILE for details." >&2
  rm -f "$PID_FILE"
  exit 1
fi

echo "SimEval server running at http://$HOST:$PORT (PID $SERVER_PID)."
echo "Logs: $LOG_FILE"
echo "PID file: $PID_FILE"

echo "Use 'kill $(cat "$PID_FILE")' to stop the server."
