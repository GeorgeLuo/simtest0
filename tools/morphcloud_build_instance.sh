#!/usr/bin/env bash
# Provision a Morphcloud instance with the SimEval server from this repository.
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: morphcloud_build_instance.sh --snapshot SNAPSHOT_ID [options]

Provisions a new Morphcloud VM from a snapshot, installs Node.js, clones the SimEval
codebase, builds/tests the workspace, configures a systemd service, and exposes it.

Required:
  --snapshot ID           Snapshot ID to boot (e.g., snapshot_h4shdjt4)

Optional:
  --name NAME             Metadata name for the instance (default: sim-eval-<timestamp>)
  --metadata key=value    Extra metadata to attach (repeatable)
  --ttl-seconds N         TTL for the instance
  --repo-url URL          Git repository to clone (default: https://github.com/GeorgeLuo/simtest0.git)
  --repo-branch BRANCH    Branch to checkout (default: main)
  --service-name NAME     Name for systemd + exposed HTTP service (default: simeval)
  --port N                Port to bind SimEval (default: 3000)
  --host HOST             Host binding (default: 0.0.0.0)
  --auth-token TOKEN      Auth token (default: random hex)
  --rate-window MS        Rate limit window (default: 60000)
  --rate-max COUNT        Rate limit max (default: 120)
  --swap-size SIZE        Swapfile size (default: 256M)
  --no-expose             Skip morphcloud instance expose-http
  --auth-mode MODE        expose-http auth mode (none|api_key, default: none)
  --skip-tests            Skip npm test step
  --keep-on-failure       Do not stop the instance if provisioning fails
  -h, --help              Show this help
USAGE
}

log() {
  printf '[%s] %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

generate_auth_token() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 16
    return
  fi

  python - <<'PY'
import secrets
print(secrets.token_hex(16))
PY
}

SNAPSHOT_ID=""
INSTANCE_NAME="sim-eval-$(date +%Y%m%d%H%M%S)"
SERVICE_NAME="simeval"
REPO_URL="https://github.com/GeorgeLuo/simtest0.git"
REPO_BRANCH="main"
REMOTE_ROOT="/root/simtest0"
WORKSPACE_SUBPATH="workspaces/Describing_Simulation_0"
HOST_BIND="0.0.0.0"
PORT="3000"
AUTH_TOKEN=""
RATE_WINDOW="60000"
RATE_MAX="120"
SWAP_SIZE="256M"
EXPOSE_HTTP=1
EXPOSE_AUTH_MODE="none"
SKIP_TESTS=0
KEEP_ON_FAILURE=0
TTL_SECONDS=""
METADATA_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --snapshot)
      SNAPSHOT_ID="$2"
      shift 2
      ;;
    --name)
      INSTANCE_NAME="$2"
      shift 2
      ;;
    --metadata)
      METADATA_ARGS+=("$2")
      shift 2
      ;;
    --ttl-seconds)
      TTL_SECONDS="$2"
      shift 2
      ;;
    --repo-url)
      REPO_URL="$2"
      shift 2
      ;;
    --repo-branch)
      REPO_BRANCH="$2"
      shift 2
      ;;
    --service-name)
      SERVICE_NAME="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --host)
      HOST_BIND="$2"
      shift 2
      ;;
    --auth-token)
      AUTH_TOKEN="$2"
      shift 2
      ;;
    --rate-window)
      RATE_WINDOW="$2"
      shift 2
      ;;
    --rate-max)
      RATE_MAX="$2"
      shift 2
      ;;
    --swap-size)
      SWAP_SIZE="$2"
      shift 2
      ;;
    --no-expose)
      EXPOSE_HTTP=0
      shift
      ;;
    --auth-mode)
      EXPOSE_AUTH_MODE="$2"
      shift 2
      ;;
    --skip-tests)
      SKIP_TESTS=1
      shift
      ;;
    --keep-on-failure)
      KEEP_ON_FAILURE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

[[ -n "$SNAPSHOT_ID" ]] || {
  echo "Error: --snapshot is required" >&2
  usage
  exit 1
}

require_cmd morphcloud
require_cmd jq

[[ -n "${MORPH_API_KEY:-}" ]] || {
  echo "Error: MORPH_API_KEY is not set in the environment." >&2
  exit 1
}

if [[ -z "$AUTH_TOKEN" ]]; then
  AUTH_TOKEN="$(generate_auth_token)"
fi

START_ARGS=(morphcloud instance start "$SNAPSHOT_ID" --metadata "name=$INSTANCE_NAME" --json)
for md in "${METADATA_ARGS[@]}"; do
  START_ARGS+=(--metadata "$md")
done
if [[ -n "$TTL_SECONDS" ]]; then
  START_ARGS+=(--ttl-seconds "$TTL_SECONDS")
fi

log "Booting instance from snapshot $SNAPSHOT_ID..."
START_OUTPUT="$("${START_ARGS[@]}")"
INSTANCE_ID="$(echo "$START_OUTPUT" | jq -r '.id')"
INTERNAL_IP="$(echo "$START_OUTPUT" | jq -r '.networking.internal_ip')"

if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "null" ]]; then
  echo "Failed to create instance." >&2
  exit 1
fi

PROVISION_SUCCESS=0
cleanup() {
  if [[ $PROVISION_SUCCESS -eq 0 && -n ${INSTANCE_ID:-} ]]; then
    if [[ $KEEP_ON_FAILURE -eq 0 ]]; then
      log "Stopping failed instance $INSTANCE_ID"
      morphcloud instance stop "$INSTANCE_ID" >/dev/null 2>&1 || true
    else
      log "Provisioning failed; instance $INSTANCE_ID left running."
    fi
  fi
}
trap cleanup EXIT

log "Instance $INSTANCE_ID booted (internal IP: $INTERNAL_IP). Waiting for ready status..."
while true; do
  STATUS="$(morphcloud instance get "$INSTANCE_ID" | jq -r '.status')"
  [[ "$STATUS" == "ready" ]] && break
  sleep 5
done
log "Instance $INSTANCE_ID is ready."

ssh_run() {
  local desc="$1"
  shift
  local cmd="$*"
  log "$desc"
  morphcloud instance ssh "$INSTANCE_ID" -- bash -lc "$cmd"
}

ssh_run "Updating apt package lists" "apt-get update"
ssh_run "Installing base packages" "DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg git build-essential apt-transport-https"
ssh_run "Installing Node.js 20.x" "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs"
ssh_run "Configuring swapfile ($SWAP_SIZE)" "if [[ ! -f /swapfile ]]; then fallocate -l $SWAP_SIZE /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab; fi"

ssh_run "Cloning repository $REPO_URL ($REPO_BRANCH)" "rm -rf '$REMOTE_ROOT' && git clone --depth 1 --branch '$REPO_BRANCH' '$REPO_URL' '$REMOTE_ROOT'"
REMOTE_WORKSPACE="$REMOTE_ROOT/$WORKSPACE_SUBPATH"

ssh_run "Installing workspace dependencies" "cd '$REMOTE_WORKSPACE' && npm install"
ssh_run "Building workspace" "cd '$REMOTE_WORKSPACE' && npm run build"
if [[ $SKIP_TESTS -eq 0 ]]; then
  ssh_run "Running workspace tests" "cd '$REMOTE_WORKSPACE' && npm test"
else
  log "Skipping npm test step (--skip-tests supplied)"
fi

ENV_BLOCK="SIMEVAL_HOST=$HOST_BIND
SIMEVAL_PORT=$PORT
SIMEVAL_AUTH_TOKEN=$AUTH_TOKEN
SIMEVAL_RATE_WINDOW_MS=$RATE_WINDOW
SIMEVAL_RATE_MAX=$RATE_MAX
NODE_ENV=production"
ssh_run "Writing /etc/simeval.env" "cat <<'EOF' > /etc/simeval.env
$ENV_BLOCK
EOF"
ssh_run "Securing /etc/simeval.env" "chmod 600 /etc/simeval.env"

SERVICE_BLOCK="[Unit]
Description=SimEval Server
After=network.target

[Service]
EnvironmentFile=/etc/simeval.env
WorkingDirectory=$REMOTE_WORKSPACE
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target"
ssh_run "Installing /etc/systemd/system/${SERVICE_NAME}.service" "cat <<'EOF' > /etc/systemd/system/${SERVICE_NAME}.service
$SERVICE_BLOCK
EOF"
ssh_run "Enabling ${SERVICE_NAME}.service" "systemctl daemon-reload && systemctl enable --now ${SERVICE_NAME}.service"
ssh_run "Service status" "systemctl status --no-pager ${SERVICE_NAME}.service"

PUBLIC_URL=""
if [[ $EXPOSE_HTTP -eq 1 ]]; then
  log "Exposing port $PORT via morphcloud (service name: $SERVICE_NAME)..."
  EXPOSE_OUTPUT="$(morphcloud instance expose-http --auth-mode "$EXPOSE_AUTH_MODE" "$INSTANCE_ID" "$SERVICE_NAME" "$PORT")"
  echo "$EXPOSE_OUTPUT"
  PUBLIC_URL="$(echo "$EXPOSE_OUTPUT" | awk '/URL:/ {print $2}' | head -n 1)"
else
  log "Skipping expose-http step (--no-expose supplied)"
fi

PROVISION_SUCCESS=1
trap - EXIT

cat <<SUMMARY

Provisioning complete.
Instance ID: $INSTANCE_ID
Internal IP: $INTERNAL_IP
Service: ${SERVICE_NAME}.service
Port: $PORT
Auth token: $AUTH_TOKEN
Public URL: ${PUBLIC_URL:-<not exposed>}

Sample health check:
  curl -sS -H 'Authorization: $AUTH_TOKEN' ${PUBLIC_URL:-http://<internal-ip>:$PORT}/api

Stop command:
  morphcloud instance stop $INSTANCE_ID
SUMMARY
