# Phase 4 Structural & Behavioral Alignment
- Introduced `SimulationPlayer`/`EvaluationPlayer` scaffolds with operation directories (`Start/Pause/Stop/Inject/Eject/InjectFrame`) per spec and refactored `IOPlayer` into a reusable base.
- Migrated server wiring to new players, enabled optional frame payloads for snapshot persistence, and centralized evaluation frame hydration.
- Added evaluation player snapshot test and updated simulation player suites/operations to cover the new structure.
- Resolved snapshot tick drift by pausing evaluation loop on load and persisting explicit frames; `tools/run_integration.sh` now completes successfully (artifacts in `workspaces/Describing_Simulation_0/verifications/20251002T054515Z`).
