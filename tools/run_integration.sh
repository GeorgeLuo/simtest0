#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
WORKSPACE_DIR="$ROOT_DIR/workspaces/Describing_Simulation_0"

echo "Sim-Eval Integration"
echo "----------------------"
# Step 1 — Build the compiled workspace required by automation.
echo "1. Build workspace artifacts"
npm --prefix "$WORKSPACE_DIR" run build

# Steps 2-5 — See instruction_documents/Describing_Simulation_0_simeval_codifying_simulations.md.
# The node automation performs these sequentially:
# 2. Start the SimEval server programmatically.
# 3. Probe the API landing page for discoverability metadata.
# 4. Verify the simulation SSE stream is idle before playback.
# 5. Inject the temperature control system, exercise playback controls, and capture artifacts.
echo "2. Start SimEval server programmatically"
echo "3. Probe API landing metadata"
echo "4. Verify simulation SSE stream is idle"
echo "5. Inject temperature system and exercise controls"
NODE_NO_WARNINGS=1 node "$ROOT_DIR/tools/run_integration.js"
