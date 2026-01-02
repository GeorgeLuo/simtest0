# Task Record — CLI deploy features and cleanup

## Summary
- Added deploy start/stop/list to the SimEval CLI with per-user state tracking and log outputs.
- Added auto-build handling for dist/main.js and configurable auto-start evaluation.
- Removed runs/ artifacts and committed the updated Describing_Simulation_0.md per request.

## Actions
- Implemented deploy commands in tools/simeval_cli.js (spawn, stop, list, state file, logging).
- Tested deployment lifecycle on port 4001 and validated health probe.
- Removed runs/ directory and committed the updated manuscript.

## Validation
- node tools/simeval_cli.js deploy start --port 4001
- node tools/simeval_cli.js health --server http://127.0.0.1:4001/api
- node tools/simeval_cli.js deploy stop --port 4001

## Done-ness
- Deploy controls work against local SimEval instances; state is stored in ~/.simeval.
- Remaining: ship the CLI changes as needed once you confirm commit expectations.
