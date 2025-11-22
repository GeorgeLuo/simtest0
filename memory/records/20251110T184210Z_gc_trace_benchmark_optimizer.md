# Phase 5 GC trace benchmark (optimizer)

## Context
- Needed to verify whether the ~40 MB RSS jump seen in 500-tick runs stemmed from retained JS objects or kernel page retention.
- Added CLI control to `tools/benchmark_simulation.js` so GC sampling only runs when requested (`--gc-mode=before|after|both`).

## Steps
1. Update benchmark harness to parse `--gc-mode` and only call `global.gc()` for the requested sample points. Default mode leaves GC untouched so regular runs measure organic behaviour; instrumentation runs pass `--gc-mode=both`.
2. Execute `node --trace-gc --expose-gc tools/benchmark_simulation.js --gc-mode=both` to capture V8 GC telemetry alongside the metrics. This produced `verifications/20251110T184141_benchmark.json` plus trace logs (multiple scavenges, one mark-compact around 728 ms).
3. Generated comparison artifact `verifications/20251110T184153Z_benchmark_comparison.json` versus the 2025-10-28 baseline for regression tracking.

## Findings
- Heap/external deltas remain minimal after forced GC (heapUsed -46%, arrayBuffers ~0), yet RSS delta increased to 43 MB, reinforcing that OS-level page retention dominates.
- Trace output shows frequent scavenges but only a single mark-compact, suggesting very little long-lived data despite the RSS plateau.
- Throughput sits at ~857 ticks/sec (‑1.9% vs baseline); variance is now dominated by host noise rather than GC pressure.

## Next actions
- Investigate whether streaming writes (JSON stringify + `res.write`) allocate native buffers that persist per connection; profiling with `--trace-gc-nvp` or memory snapshots may expose the kernel/page source.
- Consider pooling SSE string builders to cut the remaining per-tick allocations now that heap churn is quantified.
