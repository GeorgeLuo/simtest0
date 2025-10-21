# PID Plugin Cache Bust Fix – 2025-10-16T22:02Z

- SimulationPlayer now appends an mtime-based query string when dynamically importing plugins, busting Node’s module cache whenever `POST /codebase/plugin` uploads new contents.
- After restarting the server, the PID replay v2 harness reports `pid` telemetry entries on `/evaluation/stream`, confirming the updated PID controller is actually executed.
- Remaining discrepancy: `pid_state.json` still missing because the plugin doesn’t persist state yet; log in tester package remains accurate.
