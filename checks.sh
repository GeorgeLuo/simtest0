#!/usr/bin/env bash
set -euo pipefail

log_dir="verifications"
mkdir -p "$log_dir"

timestamp="$(date +%Y%m%d%H%M%S)"
log_file="$log_dir/$timestamp.log"
message="not yet implemented"

echo "$message" | tee "$log_file"
