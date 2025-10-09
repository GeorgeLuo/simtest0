#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
WORKSPACE_DIR="$ROOT_DIR/workspaces/Describing_Simulation_0"

echo "Sim-Eval Integration"
echo "----------------------"
echo "1. Build workspace artifacts"
npm --prefix "$WORKSPACE_DIR" run build

echo "2. Execute integration workflow"
NODE_NO_WARNINGS=1 node "$ROOT_DIR/tools/run_integration.js"
