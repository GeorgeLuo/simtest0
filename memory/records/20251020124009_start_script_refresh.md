# Start Script Refresh – 2025-10-20T12:40Z

## Summary
- Implemented `tools/start.sh` to install dependencies (when needed), compile the TypeScript workspace, launch `dist/main.js` with `--experimental-specifier-resolution=node`, and monitor health before reporting success.
- Added safeguards for existing listeners on port 3000, PID tracking (`tmp_manual_server.pid`), and conveniences for `start`, `stop`, and `status` commands with health probing via `curl`.
- Updated `tools/index.md` to describe the new launcher behaviour and log location.

## Verification
- `tools/start.sh start` → confirmed build, background launch, and health readiness message.
- `tools/start.sh status` → reported running PID and locations while server alive, "not running" after stop.
- `tools/start.sh stop` → terminated the managed process and removed the PID file.
