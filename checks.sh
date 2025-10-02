#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="${ROOT_DIR}/workspaces/Describing_Simulation_0"

bash "${WORKSPACE_DIR}/tools/run_integration.sh"
