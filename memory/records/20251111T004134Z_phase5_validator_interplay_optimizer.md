# Phase 5 validator interplay check (optimizer)

## Context
- Morphcloud deploys were succeeding, but the validator only confirmed streams independently.
- Needed proof that the evaluation player reflects frames actually emitted by the simulation player.

## Changes
- Enhanced `tools/morphcloud_validator.js` to capture `validator.temperature` readings from the simulation stream and assert each evaluation `validator.evaluation` payload mirrors a previously observed tick/value.
- Validator now fails fast if the evaluation stream references a tick without a matching simulation frame or if temperatures diverge.

## Validation
- `node tools/morphcloud_validator.js --url https://simeval-morphvm-4ir950r8.http.cloud.morph.so`
