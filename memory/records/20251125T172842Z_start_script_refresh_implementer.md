# Task Record — Start script refresh

## Summary
- Implementer mindset: updated `tools/start.sh` to rebuild the workspace and launch the compiled artifact so renamed instruction docs are respected.
- Verified the script boots cleanly on an alternate port and left a log under `verifications/`.

## Actions
- Changed `tools/start.sh` to always run `npm run build` and start `node dist/main.js`, removing the old dist-exists shortcut that could reuse stale builds.
- Ran `./tools/start.sh 4102`, which built the workspace, launched the server, and wrote PID/log entries in `verifications/`.
- Stopped the test server (PID 60580) and removed the temporary PID file.

## Validation
- `./tools/start.sh 4102` -> `SimEval server running at http://localhost:4102 (PID 60580).`
- Log `verifications/simeval_start_20251125T172842Z.log` contains `SimEval server listening on http://localhost:4102` with no errors; server terminated cleanly after kill.
