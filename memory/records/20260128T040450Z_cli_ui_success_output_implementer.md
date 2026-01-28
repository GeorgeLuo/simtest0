# Task Record — CLI UI success output (implementer)

## Summary
- Added consistent success JSON for previously silent UI subcommands in the CLI and centralized UI ack handling.

## Actions
- Added `waitForUiAckOrThrow` and `printUiSuccess` helpers in `tools/cli/simeval_cli.js`.
- UI subcommands that previously had no output now emit JSON success payloads with action metadata.
- Updated `ui serve` to emit JSON when the UI is already running.

## Validation
- Not run (CLI output changes only).

## Done-ness Evaluation
- UI command output is now explicit and consistent for success cases.
