#!/usr/bin/env bash
set -euo pipefail

# Captures a small evaluation stream sample after uploading/registering/injecting
# the bundled ball drop plugins. Writes the eval stream sample to verifications/eval_stream_sample.jsonl.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
BASE_URL="http://localhost:3000/api"
OUT_FILE="$ROOT_DIR/verifications/eval_stream_sample.jsonl"
EVENT_COUNT=${EVENT_COUNT:-10}

post() {
  local path="$1" data="$2"
  curl -sS -X POST -H 'Content-Type: application/json' --data "$data" "$BASE_URL$path" >/dev/null
}

main() {
  mkdir -p "$ROOT_DIR/verifications"

  # Register components
  post "/simulation/component" '{"component":{"modulePath":"plugins/simulation/components/position.js"}}'
  post "/simulation/component" '{"component":{"modulePath":"plugins/simulation/components/velocity.js"}}'
  post "/simulation/component" '{"component":{"modulePath":"plugins/simulation/components/gravity.js"}}'
  post "/evaluation/component" '{"component":{"modulePath":"plugins/evaluation/components/trace_component.js"}}'
  post "/evaluation/component" '{"component":{"modulePath":"plugins/evaluation/components/verdict_component.js"}}'

  # Inject systems
  post "/simulation/system" '{"system":{"modulePath":"plugins/simulation/systems/server_ball_spawner.js"}}'
  post "/simulation/system" '{"system":{"modulePath":"plugins/simulation/systems/server_gravity_system.js"}}'
  post "/simulation/system" '{"system":{"modulePath":"plugins/simulation/systems/server_motion_integration.js"}}'
  post "/evaluation/system" '{"system":{"modulePath":"plugins/evaluation/systems/ball_drop_verifier_v2.js"}}'

  # Start simulation
  post "/simulation/start" '{}'

  # Capture eval stream events
  python - "$BASE_URL/evaluation/stream" "$OUT_FILE" "$EVENT_COUNT" <<'PY'
import sys, json, requests
base = sys.argv[1]
out_path = sys.argv[2]
limit = int(sys.argv[3])
with requests.get(base, stream=True) as r, open(out_path, 'w', encoding='utf-8') as out:
    count = 0
    for line in r.iter_lines():
        if not line:
            continue
        if line.startswith(b'data: '):
            payload = json.loads(line.decode()[6:])
            out.write(json.dumps(payload) + '\n')
            count += 1
            if count >= limit:
                break
PY

  # Stop simulation
  post "/simulation/stop" '{}'

  echo "Eval stream sample written to $OUT_FILE"
}

main "$@"
