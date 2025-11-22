# Phase 5 benchmark comparison (optimizer)

## Context
- Tasked with comparing the post-frame-snapshot optimization benchmark (`verifications/20251028T175604_benchmark.json`) against the pre-change baseline (`verifications/20251028T160600_benchmark.json`).
- Goal: quantify throughput/memory shifts and explain the persistent ~38 MB RSS delta observed during the 500-tick harness run.

## Findings
- Authored `verifications/20251110T124848Z_benchmark_comparison.json` to codify deltas (auto-generated via `tools/benchmark_simulation.js` metrics).
- Throughput difference is statistically insignificant: ticks/sec moved from 880.1 → 874.0 (‑0.7%), duration +3.95 ms; indicates prior `entityBuffer` removal neither helps nor hurts runtime in isolation.
- RSS delta remains ~38 MB in both runs (difference ‑16 KB). Heap growth likewise tracks within ±5% while array buffers/external memory climb ~6.6%, which points to V8 retaining working-set pages rather than a new leak.
- The harness captures memory immediately after aborting the SSE stream, so large objects (e.g., final frame snapshot, SSE text buffers) are still strongly reachable via `latestMessage`/`frameFilter` until the next GC.

## Recommendations
1. Instrument a GC run before taking the “after” sample (e.g., rerun benchmark with `NODE_OPTIONS=--expose-gc` + `global.gc?.()` call) to prove RSS settles, or else profile heap snapshots for lingering frame references.
2. Explore caching of serialized SSE payloads for unchanged entity state to avoid per-tick JSON allocations if throughput headroom is still needed.
3. Consider pooling of frame/entity records if future GC diagnostics show real retention beyond the single `latestMessage` reference.

## Status
- Comparison + documentation complete; awaiting follow-up GC-instrumented benchmark before deeper optimizations.
