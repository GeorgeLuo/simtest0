#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

VERIFICATION_DIR="$ROOT_DIR/verifications"
mkdir -p "$VERIFICATION_DIR"

TIMESTAMP="$(date +"%Y%m%d%H%M%S")"
LOG_FILE="$VERIFICATION_DIR/${TIMESTAMP}.log"

touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

START_TIME="$(date -Iseconds)"

echo "Starting verification run at $START_TIME"
echo "Writing log to $LOG_FILE"

on_exit() {
  local status=$?
  echo
  if [[ $status -eq 0 ]]; then
    echo "All checks completed successfully."
  else
    echo "Checks failed with status $status."
  fi
  echo "Verification log: $LOG_FILE"
}
trap on_exit EXIT

log_section() {
  local title="$1"
  echo
  echo "==== $title ===="
}

run_step() {
  local description="$1"
  shift
  log_section "$description"
  "$@"
}

steps_run=0

log_section "Repository root"
pwd

# Node.js / npm tests
if [ -f "package.json" ]; then
  if command -v npm >/dev/null 2>&1; then
    run_step "npm test" npm test
    steps_run=$((steps_run + 1))
  else
    echo
    echo "Skipping npm test: npm not available on PATH."
  fi
fi

WORKSPACE_PROJECT_DIR="$ROOT_DIR/workspaces/Describing_Simulation_0/project"
if [ -d "$WORKSPACE_PROJECT_DIR" ] && [ -f "$WORKSPACE_PROJECT_DIR/package.json" ]; then
  if command -v npm >/dev/null 2>&1; then
    run_step "npm test (workspaces/Describing_Simulation_0/project)" \
      bash -lc "cd \"$WORKSPACE_PROJECT_DIR\" && npm test"
    steps_run=$((steps_run + 1))

    run_step "Vitest messaging suite (workspaces/Describing_Simulation_0/project)" \
      bash -lc "cd \"$WORKSPACE_PROJECT_DIR\" && npx vitest run tests/ecs/messaging"
    steps_run=$((steps_run + 1))

    # Type-check the workspace project TypeScript sources
    run_step "TypeScript type check (workspaces/Describing_Simulation_0/project)" \
      bash -lc "cd \"$WORKSPACE_PROJECT_DIR\" && npx tsc -p tsconfig.json --noEmit"
    steps_run=$((steps_run + 1))
  else
    echo
    echo "Skipping npm test for workspaces/Describing_Simulation_0/project: npm not available on PATH."
  fi
fi

# pnpm tests
if [ -f "pnpm-lock.yaml" ]; then
  if command -v pnpm >/dev/null 2>&1; then
    run_step "pnpm test" pnpm test
    steps_run=$((steps_run + 1))
  else
    echo
    echo "Skipping pnpm test: pnpm not available on PATH."
  fi
fi

# Yarn tests
if [ -f "yarn.lock" ]; then
  if command -v yarn >/dev/null 2>&1; then
    run_step "yarn test" yarn test
    steps_run=$((steps_run + 1))
  else
    echo
    echo "Skipping yarn test: yarn not available on PATH."
  fi
fi

# Python pytest
if [ -f "pyproject.toml" ] || [ -f "pytest.ini" ] || [ -d "tests" ]; then
  if command -v python >/dev/null 2>&1; then
    if python -c "import importlib.util; import sys; sys.exit(0 if importlib.util.find_spec('pytest') else 1)" >/dev/null 2>&1; then
      run_step "pytest" python -m pytest
      steps_run=$((steps_run + 1))
    else
      echo
      echo "Skipping pytest: pytest is not installed."
    fi
  else
    echo
    echo "Skipping pytest: python is not available."
  fi
fi

# Go tests
if [ -f "go.mod" ]; then
  if command -v go >/dev/null 2>&1; then
    run_step "go test" go test ./...
    steps_run=$((steps_run + 1))
  else
    echo
    echo "Skipping go test: go is not available."
  fi
fi

# Rust tests
if [ -f "Cargo.toml" ]; then
  if command -v cargo >/dev/null 2>&1; then
    run_step "cargo test" cargo test --all --locked
    steps_run=$((steps_run + 1))
  else
    echo
    echo "Skipping cargo test: cargo is not available."
  fi
fi

# Makefile test target
if [ -f "Makefile" ] && command -v make >/dev/null 2>&1; then
  if grep -qE '^test:' Makefile; then
    run_step "make test" make test
    steps_run=$((steps_run + 1))
  fi
fi

if [ "$steps_run" -eq 0 ]; then
  echo
  echo "No automated checks were executed. Add project-specific tests to this script as needed."
fi
