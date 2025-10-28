# Phase 5 cycle snapshot optimization (optimizer)

## Context
- Targeted the high-frequency frame snapshot path to cut per-tick allocations noted during prior optimization benchmarking.

## Changes
- Removed the intermediate `entityBuffer` array in `IOPlayer.createFrameSnapshot`, iterating entities directly via `entityManager.forEach` while reusing the existing component buffer.
- This avoids an array resize + push per tick, reducing memory churn and branch work in the hot loop.
- Full Jest suite executed (`npm --prefix workspaces/Describing_Simulation_0 run test`) to confirm behaviour.

## Notes
- Further optimization opportunities: evaluate caching of serialized SSE payloads when frame payloads remain unchanged between ticks.
- Ready for additional Phase 5 runtime profiling once new benchmarks are captured.
