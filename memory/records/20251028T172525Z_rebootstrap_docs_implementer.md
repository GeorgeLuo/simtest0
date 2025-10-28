# Re-bootstrap instruction documents (implementer)

## Context
- Re-ran Phase 1 bootstrapping using updated `Describing_Simulation_0.md`.

## Updates
- Regenerated all instruction_documents segments, including bootstraps, schedule, API map, theory, and codifying sections (integration split into dedicated outsider guide).
- Synced mindset prompts to current spec (added packager and outsider, removed integrator) and refreshed indexes.
- Added `tools/start.sh`, updated tools index, and ensured memory directory includes `ways/` and `exceptions/` per bootstraps.

## Follow-up
- Verify `tools/start.sh` fits packager expectations during next packaging review.
- Future records should include mindset suffix in filename per updated guidance.
