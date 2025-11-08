# Simulation Frame Integrity

Our entity-component-system pipeline assumes frames stay internally consistent and immutable once published.

- Entities are allocated and torn down through `EntityManager`, with `ComponentManager` cleaning up per-type maps so each entity holds at most one component of a given id (`workspaces/Describing_Simulation_0/src/core/entity/EntityManager.ts`, `workspaces/Describing_Simulation_0/src/core/components/ComponentManager.ts`); the Phase 2 IO player record (`memory/records/20251007165648_checkpoint6_task4_and_5_io_player.md`) shows how player hooks rely on that discipline.
- `SystemManager` initializes systems on registration and runs them sequentially each tick, so new systems must be side-effect free outside their `update` calls (`workspaces/Describing_Simulation_0/src/core/systems/SystemManager.ts`).
- `IOPlayer` snapshots entities after every cycle using a reusable component buffer and delegates filter decisions to `FrameFilter` (`workspaces/Describing_Simulation_0/src/core/IOPlayer.ts`, `workspaces/Describing_Simulation_0/src/core/messaging/outbound/FrameFilter.ts`); tests added in Phase 2 Checkpoint VIII confirm evaluation players respect the same contract (`memory/records/20251007180731_checkpoint8_task3_tests_and_task4_implementation.md`).
- `FrameFilter` returns the original frame reference when no blacklist is configured, so downstream consumers *must* treat frames as immutable; the re-benchmark summary (`memory/records/20251010220430_phase5_task5_rebenchmark_summary.md`) captures the risk if a caller mutates payloads after publication.

Any change that breaks these assumptions cascades into the SSE stream, benchmark harness, and evaluation consumers, so keep their invariants in mind before tweaking the frame lifecycle.
