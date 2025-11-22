# Task Record — Component stream filter utility

## Summary
- Implementer mindset: built a CLI helper that reuses the SimEval SSE stream to emit just one component’s payload for rapid debugging.
- Tool accepts server URL, stream path, component id, optional entity filter, and supports JSON/text output plus bearer auth reuse.

## Actions
- Added `tools/component_stream_filter.js` with argument parsing, SSE parsing, and component extraction logic that prints `{ tick, entityId, value }` records.
- Hooked up signal handling for graceful shutdown, documented usage/help text, and registered the script inside `tools/index.md`.

## Validation
- `node tools/component_stream_filter.js --help`
- `node tools/component_stream_filter.js` (verifies required-argument guard rails)
