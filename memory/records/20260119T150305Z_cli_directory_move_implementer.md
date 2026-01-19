# Task Record — Move CLI scripts into tools/cli (implementer)

## Summary
- Moved the SimEval CLI and Morphcloud tooling into `tools/cli/` and updated documentation, bin mappings, and usage strings.
- Fixed path assumptions so scripts still resolve the repo root after the move.

## Actions
- Relocated `simeval_cli.js`, `cli_config.js`, `morphcloud_distributor.js`, `morphcloud_validator.js`, `morphcloud_clone_snapshot.js`, and `morphcloud_build_instance.sh` into `tools/cli/`.
- Updated `package.json` bin entries plus README and `tools/index.md` references to the new paths.
- Adjusted `simeval_cli.js` default workspace resolution and `morphcloud_build_instance.sh` root detection for the deeper directory.
- Refreshed Morphcloud tool usage strings to reflect `tools/cli/...` paths.

## Validation
- Not run (path and doc updates only).

## Done-ness Evaluation
- CLI tooling now lives under `tools/cli/` with updated references; ready for follow-on cleanup or new CLI-only flows.
