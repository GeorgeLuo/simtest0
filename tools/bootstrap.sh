#!/usr/bin/env bash
# Bootstrap script for setting up the local development environment.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_PATH="$REPO_ROOT/.venv"
CONFIG_DIR="$REPO_ROOT/config"
CONFIG_FILE="$CONFIG_DIR/local.env"
REQUIREMENTS_FILE="$SCRIPT_DIR/requirements.txt"

section() {
  echo
  echo "==> $1"
}

info() {
  echo "    - $1"
}

warn() {
  echo "    ! $1"
}

install_apt_packages() {
  local packages=("$@")
  local missing_packages=()

  for pkg in "${packages[@]}"; do
    if ! dpkg -s "$pkg" >/dev/null 2>&1; then
      missing_packages+=("$pkg")
    fi
  done

  if [[ ${#missing_packages[@]} -eq 0 ]]; then
    info "All requested APT packages are already installed."
    return 0
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    warn "apt-get is not available. Install ${missing_packages[*]} manually."
    return 0
  fi

  local sudo_cmd=()
  if [[ $EUID -ne 0 ]]; then
    if command -v sudo >/dev/null 2>&1; then
      sudo_cmd=(sudo)
    else
      warn "Missing sudo access. Install ${missing_packages[*]} manually."
      return 0
    fi
  fi

  section "Installing system packages: ${missing_packages[*]}"
  "${sudo_cmd[@]}" apt-get update
  "${sudo_cmd[@]}" apt-get install -y "${missing_packages[@]}"
}

ensure_python_tooling() {
  section "Validating Python tooling"

  if ! command -v python3 >/dev/null 2>&1; then
    warn "python3 is not available on PATH. Attempting installation via apt-get."
    install_apt_packages python3 python3-venv python3-pip
  else
    info "python3 detected at $(command -v python3)"
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 is required but could not be installed automatically." >&2
    exit 1
  fi

  install_apt_packages python3-venv python3-pip
}

ensure_virtualenv() {
  section "Creating Python virtual environment"

  if [[ ! -d "$VENV_PATH" ]]; then
    python3 -m venv "$VENV_PATH"
    info "Created virtual environment at $VENV_PATH"
  else
    info "Virtual environment already exists at $VENV_PATH"
  fi

  "$VENV_PATH/bin/python" -m pip install --upgrade pip
  if [[ -f "$REQUIREMENTS_FILE" ]]; then
    info "Installing Python packages from $REQUIREMENTS_FILE"
    "$VENV_PATH/bin/python" -m pip install -r "$REQUIREMENTS_FILE"
  else
    warn "Requirements file $REQUIREMENTS_FILE not found; skipping Python package installation."
  fi
}

ensure_local_config() {
  section "Preparing local configuration"

  mkdir -p "$CONFIG_DIR"

  if [[ ! -f "$CONFIG_FILE" ]]; then
    cat > "$CONFIG_FILE" <<'CONFIG'
# Local developer settings for the simulation workspace.
# Adjust the paths or environment variables as needed for your machine.
SIMULATION_WORKSPACE_DIR="workspaces"
VERIFICATION_LOG_DIR="verifications"
DEFAULT_EDITOR="code"
CONFIG
    info "Wrote default configuration to $CONFIG_FILE"
  else
    info "Configuration file already present at $CONFIG_FILE; leaving unchanged."
  fi
}

summarize() {
  section "Bootstrap summary"
  info "Virtual environment: $VENV_PATH"
  info "Local configuration: $CONFIG_FILE"
  info "To activate the environment run: source $VENV_PATH/bin/activate"
  info "Run ./checks.sh to execute repository checks."
}

main() {
  section "Starting bootstrap for repository at $REPO_ROOT"
  ensure_python_tooling
  ensure_virtualenv
  ensure_local_config
  summarize
}

main "$@"
