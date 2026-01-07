# Task Record — Filtered Frame Capture

## Summary
- Switched component-filtered stream capture to emit filtered frames instead of flattened component records.

## Actions
- Updated `captureStream` in `tools/simeval_cli.js` to filter frame entities by component/entity and write the filtered frame shape.
- Added `filterFrame` helper to preserve tick + entities shape while filtering.

## Validation
- Not run (requires live SSE stream).

## Done-ness Evaluation
- Behavior change implemented; runtime validation pending against a live server.
