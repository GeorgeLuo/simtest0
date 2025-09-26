#!/usr/bin/env bash
# This script aggregates all validation steps for the repository.
# It writes the combined output to a timestamped log file inside the
# verifications/ directory so each run has an auditable record.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERIFICATIONS_DIR="$ROOT_DIR/verifications"

# Ensure the verifications directory exists before attempting to log results.
mkdir -p "$VERIFICATIONS_DIR"

# Capture results in a file named with the current UTC timestamp (e.g. 20240101T120000Z.log).
timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
results_file="$VERIFICATIONS_DIR/${timestamp}.log"

# Send all stdout/stderr to the console *and* the timestamped log file.
exec > >(tee "$results_file") 2>&1

printf 'Running repository checks at %s\n\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Track whether any of the checks fail so we can exit with a non-zero status
# code while still reporting the status of each individual check.
overall_status=0

declare -A required_paths=(
  ["AGENTS.md"]="file"
  ["instruction_documents/index.md"]="file"
  ["instruction_documents/Describing_Simulation_0_theory.md"]="file"
  ["instruction_documents/Describing_Simulation_0_codifying_simulations.md"]="file"
  ["instruction_documents/Describing_Simulation_0_bootstraps.md"]="file"
  ["instruction_documents/Describing_Simulation_0_master_prompt.md"]="file"
  ["tools/index.md"]="file"
  ["workspaces/Describing_Simulation_0"]="dir"
  ["memory/ways"]="dir"
  ["memory/records"]="dir"
  ["verifications"]="dir"
)

for path in "${!required_paths[@]}"; do
  expected_type="${required_paths[$path]}"
  full_path="$ROOT_DIR/$path"

  if [[ "$expected_type" == "file" && -f "$full_path" ]]; then
    printf '[PASS] Required file present: %s\n' "$path"
  elif [[ "$expected_type" == "dir" && -d "$full_path" ]]; then
    printf '[PASS] Required directory present: %s\n' "$path"
  else
    printf '[FAIL] Missing required %s: %s\n' "$expected_type" "$path"
    overall_status=1
  fi
done

if [[ "$overall_status" -ne 0 ]]; then
  printf '\nOne or more required paths are missing.\n'
else
  printf '\nAll required paths are present.\n'
fi

project_dir="$ROOT_DIR/workspaces/Describing_Simulation_0/project"
if [[ "$overall_status" -eq 0 ]]; then
  if [[ -d "$project_dir" ]]; then
    printf '\nRunning Describing Simulation 0 project tests (npm test -- --runInBand)...\n'
    if (
      cd "$project_dir" &&
      npm test -- --runInBand
    ); then
      printf '\n[PASS] Workspace project tests succeeded.\n'
    else
      printf '\n[FAIL] Workspace project tests failed.\n'
      overall_status=1
    fi
  else
    printf '\n[WARN] Workspace project directory not found; skipping tests.\n'
  fi
else
  printf '\nSkipping project tests because required paths are missing.\n'
fi

exit "$overall_status"
