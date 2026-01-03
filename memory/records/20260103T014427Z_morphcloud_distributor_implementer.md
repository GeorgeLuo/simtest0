# Task Record — Morphcloud Distributor CLI

## Summary
- Added `tools/morphcloud_distributor.js` to provision Morphcloud SimEval fleets (build/clone modes), track instances in `~/.simeval/morphcloud.json`, and dispatch `simeval_cli.js`/validator commands across the fleet.
- Documented the new distributor CLI in `tools/index.md` and the repo `README.md` with usage examples and state file details.

## Actions
- Implemented provisioning wrappers around `morphcloud_build_instance.sh` and `morphcloud_clone_snapshot.js`, including optional morphcloud update checks, concurrency, and output parsing for instance metadata.
- Added list/stop/simeval/validate/update subcommands plus state persistence and target filtering.

## Validation
- Ran `node tools/morphcloud_distributor.js --help` and `node tools/morphcloud_distributor.js list` locally.
- Did not run live Morphcloud provisioning or remote validation (requires MORPH_API_KEY and morphcloud CLI access).

## Done-ness Evaluation
- Core CLI + docs are complete; live provisioning still needs an end-to-end run once credentials are available.
