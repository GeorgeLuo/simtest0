# Task Record — Simeval bootstrapping refresh

## Summary
- Implementer mindset: regenerated instruction_documents set with simeval-prefixed extracts and updated indexes to point to them.
- Mirrored the source manuscript into instruction_documents to align with the current spec revisions.

## Actions
- Copied the latest `Describing_Simulation_0.md` into `instruction_documents/` and produced simeval-prefixed extracts for bootstraps, repository/code structure, theory, codifying simulations, API map, schedule, implementation guidelines, outsider integration, and the master prompt.
- Generated simeval mindset prompt files and refreshed the simeval table of contents directly from the current manuscript headings.
- Updated `instruction_documents/index.md` and `instruction_documents/mindset_prompts/index.md` to foreground the simeval set while keeping the legacy entries for continuity.

## Validation
- Documentation-only change; manual inspection of new files (no automated tests run).
