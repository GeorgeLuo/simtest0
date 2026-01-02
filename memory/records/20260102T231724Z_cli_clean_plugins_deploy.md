# Task Record — CLI clean-plugins deploy option

## Summary
- Added --clean-plugins to deploy start to wipe plugin files before launching a server, keeping plugin directories aligned with the baseline scaffold.
- Documented deploy options in CLI usage and updated the tools index description.

## Actions
- Implemented plugin cleanup helper in tools/simeval_cli.js (preserves .gitkeep in baseline plugin dirs).
- Included clean summary in deploy start output.
- Verified deploy start/stop with --clean-plugins on port 4010.

## Validation
- node tools/simeval_cli.js deploy start --port 4010 --clean-plugins
- node tools/simeval_cli.js deploy stop --port 4010

## Done-ness
- CLI now supports optional cleanup to avoid stale plugin confusion without server changes.
