# Phase 0 Bootstraps – Repository Checks Script

- Implemented `checks.sh` to orchestrate workspace cleanup, `npm run build`, `npm test`, and optional integration execution while teeing outputs into `verifications/checks_<timestamp>.log`.
- Added `--integration` CLI flag, descriptive logging, and command quoting so operators can see the exact invocations recorded in the log; updated `tools/index.md` with usage guidance.
- Ran `./checks.sh`, producing `verifications/checks_20251016T201346Z.log` and confirming the script exits successfully after completing the build/test sweep.
