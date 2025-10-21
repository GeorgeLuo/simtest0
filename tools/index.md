# Tools Directory

- `checks.sh`: Top-level verification harness (`./checks.sh [--integration]`) that cleans the workspace build artifacts, runs `npm run build`, executes `npm test`, and optionally chains the integration workflow while teeing output to `verifications/checks_<timestamp>.log`.
- `start.sh`: Builds the TypeScript workspace (if needed) and launches the simulator in the background, writing logs to `tmp_manual_server.log` and tracking the process via `tools/start.sh stop`.
- `run_integration.sh`: Automates the integration workflow (build, start, probe API, upload plugins, stream evaluation data). Run `./tools/run_integration.sh` to produce timestamped artifacts under `verifications/`.
