#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
OUTPUT_DIR="${WORKSPACE_DIR}/verifications"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="${OUTPUT_DIR}/${TIMESTAMP}"
SHELL_LOG="${RUN_DIR}/shell.log"

mkdir -p "${RUN_DIR}"

log() {
  echo "[$(date -u +%H:%M:%S)] $*" >&2
}

cd "${WORKSPACE_DIR}"

log "Installing dependencies"
echo "npm install" >>"${SHELL_LOG}"
npm install >>"${SHELL_LOG}" 2>&1

log "Building TypeScript"
echo "npm run build" >>"${SHELL_LOG}"
npm run build >>"${SHELL_LOG}" 2>&1

HTTP_RUN_DIR="${RUN_DIR}/http"
mkdir -p "${HTTP_RUN_DIR}"
log "Running HTTP integration harness (best effort)"
echo "HTTP_RUN_DIR=${HTTP_RUN_DIR} node --loader ts-node/esm --experimental-specifier-resolution=node tools/http_integration.ts" >>"${SHELL_LOG}"
if HTTP_RUN_DIR="${HTTP_RUN_DIR}" node --loader ts-node/esm --experimental-specifier-resolution=node tools/http_integration.ts >>"${SHELL_LOG}" 2>&1; then
  log "HTTP harness completed"
else
  log "HTTP harness failed or skipped; see shell log"
fi

log "Running direct integration harness"
echo "INTEGRATION_RUN_DIR=${RUN_DIR}/direct node --loader ts-node/esm --experimental-specifier-resolution=node tools/run_integration.ts" >>"${SHELL_LOG}"
INTEGRATION_RUN_DIR="${RUN_DIR}/direct" node --loader ts-node/esm --experimental-specifier-resolution=node tools/run_integration.ts >>"${SHELL_LOG}" 2>&1

log "Integration run complete (artifacts in ${RUN_DIR})"
