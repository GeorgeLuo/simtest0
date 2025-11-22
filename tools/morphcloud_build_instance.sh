#!/usr/bin/env bash
# Provision a Morphcloud instance with the SimEval server from this repository.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ARCHIVE_PATH="$(mktemp -t simeval-bundle-XXXXXX.tar.gz)"
BUNDLE_ITEMS=("workspaces/Describing_Simulation_0")
HAS_INSTRUCTIONS=0
if [[ -d "$ROOT_DIR/instruction_documents" ]]; then
  BUNDLE_ITEMS+=("instruction_documents")
  HAS_INSTRUCTIONS=1
fi

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
  --disk-size MB          Disk size in MB for the new instance (default: 2048)
  --repo-url URL          Git repository to clone (default: https://github.com/GeorgeLuo/simtest0.git)
  --repo-branch BRANCH    Branch to checkout (default: main)
  --service-name NAME     Name for systemd + exposed HTTP service (default: simeval)
  --port N                Port to bind SimEval (default: 3000)
  --host HOST             Host binding (default: 0.0.0.0)
  --auth-token TOKEN      Auth token (default: disabled)
  --no-auth               Disable auth entirely (omit token)
  --rate-window MS        Rate limit window (default: 60000)
  --rate-max COUNT        Rate limit max (default: 120)
  --swap-size SIZE        Swapfile size (default: 1G)
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

SNAPSHOT_ID=""
INSTANCE_NAME="sim-eval-$(date +%Y%m%d%H%M%S)"
SERVICE_NAME="simeval"
REPO_URL="https://github.com/GeorgeLuo/simtest0.git"
REPO_BRANCH="main"
REMOTE_WORKSPACE="/root/Describing_Simulation_0"
REMOTE_BUNDLE_DIR="/root/simeval_bundle"
REMOTE_ARCHIVE="/root/simeval_bundle.tar.gz"
HOST_BIND="0.0.0.0"
PORT="3000"
AUTH_TOKEN=""
AUTH_TOKEN_SUPPLIED=0
RATE_WINDOW="60000"
RATE_MAX="120"
SWAP_SIZE="1G"
EXPOSE_HTTP=1
EXPOSE_AUTH_MODE="none"
SKIP_TESTS=0
KEEP_ON_FAILURE=0
DISK_SIZE="2048"
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
    --disk-size)
      DISK_SIZE="$2"
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
      AUTH_TOKEN_SUPPLIED=1
      shift 2
      ;;
    --no-auth)
      AUTH_TOKEN=""
      AUTH_TOKEN_SUPPLIED=1
      shift
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

cleanup_archive() {
  rm -f "$ARCHIVE_PATH"
}

trap cleanup_archive EXIT

LOCAL_WORKSPACE="$ROOT_DIR/workspaces/Describing_Simulation_0"
log "Preparing local workspace artifacts"
npm --prefix "$LOCAL_WORKSPACE" install >/dev/null
npm --prefix "$LOCAL_WORKSPACE" run build >/dev/null

log "Packaging workspace bundle..."
tar -czf "$ARCHIVE_PATH" -C "$ROOT_DIR" "${BUNDLE_ITEMS[@]}"

BOOT_ARGS=(morphcloud instance boot "$SNAPSHOT_ID" --metadata "name=$INSTANCE_NAME")
if ((${#METADATA_ARGS[@]})); then
  for md in "${METADATA_ARGS[@]}"; do
    BOOT_ARGS+=(--metadata "$md")
  done
fi
if [[ -n "$DISK_SIZE" ]]; then
  BOOT_ARGS+=(--disk-size "$DISK_SIZE")
fi

log "Booting instance from snapshot $SNAPSHOT_ID..."
BOOT_OUTPUT="$("${BOOT_ARGS[@]}" | tr -d '\r')"
INSTANCE_ID="$(echo "$BOOT_OUTPUT" | awk '/Instance booted:/ {print $3}' | tail -n 1)"

if [[ -z "$INSTANCE_ID" ]]; then
  echo "Failed to determine instance ID from morphcloud output." >&2
  echo "$BOOT_OUTPUT" >&2
  exit 1
fi

INSTANCE_JSON="$(morphcloud instance get "$INSTANCE_ID")"
INTERNAL_IP="$(echo "$INSTANCE_JSON" | jq -r '.networking.internal_ip')"

if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "null" ]]; then
  echo "Failed to create instance." >&2
  exit 1
fi

PROVISION_SUCCESS=0
cleanup() {
  cleanup_archive
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

wait_for_ssh() {
  local attempts=0
  while [[ $attempts -lt 30 ]]; do
    if morphcloud instance ssh "$INSTANCE_ID" -- 'true' >/dev/null 2>&1; then
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 2
  done
  echo "SSH not ready after waiting." >&2
  exit 1
}

wait_for_ssh

log "Uploading workspace bundle"
morphcloud instance copy "$ARCHIVE_PATH" "$INSTANCE_ID:$REMOTE_ARCHIVE"

ssh_exec() {
  local cmd="$*"
  local escaped_cmd=${cmd//\'/\'\\\'\'}
  local remote_cmd="bash -lc '$escaped_cmd'"
  morphcloud instance ssh "$INSTANCE_ID" -- "$remote_cmd"
}

ssh_run() {
  local desc="$1"
  shift
  local cmd="$*"
  log "$desc"
  ssh_exec "$cmd"
}

ssh_run "Configuring swapfile ($SWAP_SIZE)" "
if [[ ! -f /swapfile ]]; then
  (fallocate -l $SWAP_SIZE /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=$(( ${SWAP_SIZE%G} * 1024 )))
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  sed -i '/\\/swapfile/d' /etc/fstab
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi"
ssh_run "Updating apt package lists" "apt-get update"
ssh_run "Installing base packages" "DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg git"
ssh_run "Installing Node.js 20.x" "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs"
ssh_run "Cleaning apt cache" "apt-get clean"

ssh_run "Extracting workspace bundle" "rm -rf '$REMOTE_WORKSPACE' '$REMOTE_BUNDLE_DIR' && mkdir -p '$REMOTE_BUNDLE_DIR' && tar -xzf '$REMOTE_ARCHIVE' -C '$REMOTE_BUNDLE_DIR'"
ssh_run "Placing workspace files" "mv '$REMOTE_BUNDLE_DIR/workspaces/Describing_Simulation_0' '$REMOTE_WORKSPACE'"
if [[ $HAS_INSTRUCTIONS -eq 1 ]]; then
  ssh_run "Copying instruction documents" "rm -rf '$REMOTE_WORKSPACE/instruction_documents' && cp -R '$REMOTE_BUNDLE_DIR/instruction_documents' '$REMOTE_WORKSPACE/instruction_documents'"
fi
ssh_run "Cleaning bundle artifacts" "rm -rf '$REMOTE_BUNDLE_DIR' '$REMOTE_ARCHIVE'"

ssh_run "Installing workspace dependencies" "cd '$REMOTE_WORKSPACE' && npm install"
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
ssh_run "Enabling ${SERVICE_NAME}.service" "systemctl daemon-reload && systemctl enable ${SERVICE_NAME}.service"
ssh_run "Restarting ${SERVICE_NAME}.service" "systemctl restart ${SERVICE_NAME}.service"
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
cleanup_archive
trap - EXIT

AUTH_HEADER_CMD=""
AUTH_TOKEN_DISPLAY="<disabled>"
if [[ -n "$AUTH_TOKEN" ]]; then
  AUTH_HEADER_CMD="-H 'Authorization: $AUTH_TOKEN' "
  AUTH_TOKEN_DISPLAY="$AUTH_TOKEN"
fi

cat <<SUMMARY

Provisioning complete.
Instance ID: $INSTANCE_ID
Internal IP: $INTERNAL_IP
Service: ${SERVICE_NAME}.service
Port: $PORT
Auth token: $AUTH_TOKEN_DISPLAY
Public URL: ${PUBLIC_URL:-<not exposed>}

Sample health check:
  curl -sS ${AUTH_HEADER_CMD}${PUBLIC_URL:-http://<internal-ip>:$PORT}/api

Stop command:
  morphcloud instance stop $INSTANCE_ID
SUMMARY
