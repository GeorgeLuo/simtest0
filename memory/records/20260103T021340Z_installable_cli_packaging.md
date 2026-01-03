# Task Record — Installable CLIs

## Summary
- Added a root `package.json` with `bin` entries so `simeval` and the Morphcloud distributor can be installed as global CLIs.
- Updated the README with npm install instructions and CLI names/aliases.

## Actions
- Added `package.json` mapping `simeval` and `simeval-morphcloud` (plus `morphcloud-distributor` alias) to the scripts in `tools/`.
- Updated `README.md` with npm install instructions, usage examples, and alias note.

## Validation
- Not run (packaging changes only).

## Done-ness Evaluation
- Packaging changes are complete; next validation step is `npm install -g .` followed by CLI invocations from outside the repo.
