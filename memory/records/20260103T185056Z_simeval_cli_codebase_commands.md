# Task Record — CLI Codebase Exploration

## Summary
- Added `codebase tree` and `codebase file` commands to the SimEval CLI for browsing the server codebase.
- Documented the new commands in `README.md` and `tools/index.md`.

## Actions
- Implemented `handleCodebase` in `tools/simeval_cli.js` with support for `--path` and optional file aliases.
- Updated CLI help output and docs to include the new commands.

## Validation
- `node tools/simeval_cli.js codebase --help`

## Done-ness Evaluation
- CLI support for codebase exploration is complete; live testing against a server is still needed when available.
