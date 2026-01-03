# Task Record — Simeval CLI Morphcloud Wrapper

## Summary
- Wrapped the Morphcloud distributor into `simeval_cli.js` as a `morphcloud` subcommand.
- Updated CLI usage docs to point to the new unified entry point.

## Actions
- Added a `morphcloud` command in `tools/simeval_cli.js` that forwards arguments to `tools/morphcloud_distributor.js`.
- Adjusted help handling so `simeval morphcloud --help` shows distributor help.
- Updated `README.md` and `tools/index.md` to mention `simeval morphcloud ...` usage.

## Validation
- `node tools/simeval_cli.js morphcloud --help`
- `node tools/simeval_cli.js morphcloud list`

## Done-ness Evaluation
- Morphcloud distributor is accessible through the main `simeval` CLI; packaging documentation reflects the change.
