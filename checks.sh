#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")" && pwd)"
workspace_dir="$root_dir/workspaces/Describing_Simulation_0"

if [[ ! -d "$workspace_dir" ]]; then
  echo "Expected workspace directory at $workspace_dir" >&2
  exit 1
fi

cd "$workspace_dir"

if [[ -f package.json ]]; then
  if [[ ! -d node_modules ]]; then
    npm install
  fi
  npm test
else
  echo "No package.json present; nothing to validate."
fi
