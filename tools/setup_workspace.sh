#!/usr/bin/env bash
set -euo pipefail

show_usage() {
  cat <<'USAGE'
Usage: setup_workspace.sh <workspace_path>

Initializes the core directory structure for a workspace, creating source and test directories when they are missing.
USAGE
}

if [[ $# -eq 0 ]]; then
  show_usage >&2
  exit 1
fi

if [[ $# -gt 1 ]]; then
  show_usage >&2
  exit 1
fi

case "$1" in
  -h|--help)
    show_usage
    exit 0
    ;;
  *)
    workspace_dir=$1
    ;;
esac

if [[ -z "${workspace_dir:-}" ]]; then
  show_usage >&2
  exit 1
fi

mkdir -p "$workspace_dir"

declare -a required_dirs=(
  "src"
  "tests"
  "tests/unit"
  "tests/integration"
)

for subdir in "${required_dirs[@]}"; do
  dir_path="$workspace_dir/$subdir"
  if [[ -d "$dir_path" ]]; then
    printf 'Skipping existing directory: %s\n' "$dir_path"
  else
    mkdir -p "$dir_path"
    printf 'Created directory: %s\n' "$dir_path"
  fi
done

printf 'Workspace initialization complete for: %s\n' "$workspace_dir"

