# Phase 5 SSE serialization cache (optimizer)

## Context
- Prior profiling showed RSS plateaus driven by kernel page retention rather than heap leaks. Next bottleneck was per-connection `JSON.stringify` churn inside both SSE routes, especially when multiple clients consume the same frame.

## Changes
1. Added per-route serialization caches using `WeakMap<OutboundMessage, string>` in `src/routes/simulation.ts` and `src/routes/evaluation.ts`. Each outbound frame/ack now incurs at most one `JSON.stringify` per route; subsequent writes (initial backlog replay + active subscribers) reuse the cached `data: ...\n\n` chunk until the message is GC'd.
2. Replaced inline heartbeat/connected literals with constants to avoid reallocation hot spots and documented the helper `writeSseMessage` that centralizes chunk formatting.
3. Rebuilt the workspace (`npm --prefix workspaces/Describing_Simulation_0 run build`) and executed the benchmark harness (`node tools/benchmark_simulation.js --gc-mode=none`). Results recorded at `verifications/20251110T215653_benchmark.json` with comparison vs. the Oct 28 baseline stored in `verifications/20251110T215702Z_benchmark_comparison.json`.

## Findings
- Throughput remained within noise (≈834 ticks/sec), which is expected because the optimization mostly trims redundant serialization work that only manifests with multiple SSE consumers. Native string/buffer churn should drop proportionally to the number of active clients.
- RSS delta stayed high (~45 MB) confirming the earlier conclusion that kernel page retention dominates; the new caching does not regress heap/external metrics.

## Follow-up
- If future benchmarks involve multiple concurrent SSE readers, re-run `tools/benchmark_simulation.js` with artificial subscribers to quantify string cache wins.
- Continue investigating native buffer reuse (e.g., pooling for `res.write`) if RSS deltas become blocking.
