# Phase 5 — Optimization Task Queue (Post-Baseline Update)

## Context
- Baseline metrics from `verifications/20251009T155032_benchmark.json` capture 500 frames in 25 426.0622 ms (≈19.6649 ticks/sec).
- The throughput ceiling aligns with `IOPlayer`'s `DEFAULT_CYCLE_INTERVAL_MS = 50`, so optimizations will remain invisible until the timer delay can be overridden during benchmarking.
- This queue supersedes Tasks 2–4 from `memory/records/20251007224130_phase5_task_queue.md`, retaining Task 1 as complete and sequencing the remaining Phase 5 work to expose measurable gains.

## Task 2: Enable Fast-Cycle Benchmark Mode
- **Lifecycle**: Phase 5 Optimization — Step 2 (Measurement Refinement)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/main.ts`, `workspaces/Describing_Simulation_0/src/core/simplayer/IOPlayer.ts`, `workspaces/Describing_Simulation_0/src/core/evalplayer/EvaluationPlayer.ts`, `tools/benchmark_simulation.js`, associated unit tests.
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_schedule_of_work.md` — Optimization cadence and validation expectations.
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Player construction and messaging architecture.
  - `memory/records/20251009115043_phase5_task1_performance_baseline.md` — Baseline observations and verification workflow.
- **Objective**: Allow workspace consumers (benchmark harness, future tooling) to run simulation ticks without the 50 ms wall-clock delay so throughput improvements become observable while preserving default behaviour for integration tests.
- **Definition of Done**:
  1. Extend `start` options (type definitions and implementation) to accept an optional `cycleIntervalMs` override and apply it when instantiating both simulation and evaluation players, defaulting to 50 ms when unspecified.
  2. Update `tools/benchmark_simulation.js` to request a near-zero interval during measurements while keeping `tools/run_integration.js` and CLI usage on the default cadence. Add or adjust unit coverage to confirm the override is honoured.
  3. Run `npm --prefix workspaces/Describing_Simulation_0 test` and `./tools/run_integration.sh` to ensure behaviour remains stable; capture any documentation touch-ups required (e.g., `README.md` options) in the task record.

## Task 3: Optimize Bus Publish Path
- **Lifecycle**: Phase 5 Optimization — Step 3 (Hot-path Tightening)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/messaging/Bus.ts`, `workspaces/Describing_Simulation_0/src/core/messaging/__tests__/`
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Messaging bus invariants and subscriber lifecycle expectations.
  - Updated benchmarking harness from Task 2 for validating throughput changes.
  - `instruction_documents/Describing_Simulation_0_implementation_guidelines.md` — Refactor discipline and regression safety.
- **Objective**: Eliminate the per-publish `[...]` clone and any avoidable allocations while preserving subscriber ordering and resilience to unsubscribe/resubscribe during dispatch.
- **Definition of Done**:
  1. Refactor `Bus.publish` to iterate without cloning, defending against subscriber mutations (unsubscribes/resubscribes) and re-entrancy.
  2. Expand tests to cover unsubscribe-inside-callback, re-entrancy, and idempotent delivery ordering guarantees.
  3. Execute workspace tests and `./tools/run_integration.sh`; record quick benchmark readings (using the fast-cycle mode) alongside notes on behavioural parity.

## Task 4: Reduce Frame Snapshot Allocations
- **Lifecycle**: Phase 5 Optimization — Step 4 (Simulation Loop Efficiency)
- **Mindset**: Implementer
- **Workspace**: `workspaces/Describing_Simulation_0/src/core/simplayer/IOPlayer.ts`, `workspaces/Describing_Simulation_0/src/core/components/ComponentManager.ts`, `workspaces/Describing_Simulation_0/src/core/messaging/outbound/FrameFilter.ts`, relevant tests.
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_codifying_simulations.md` — Frame construction and component exposure constraints.
  - Baseline benchmark artefacts plus post-Task-3 measurements to target allocation hotspots.
  - Existing unit suites for `IOPlayer`, component manager, and outbound messaging.
- **Objective**: Cut per-tick object churn (entity list copies, component arrays, frame cloning) while ensuring published frames stay immutable from subscriber perspectives.
- **Definition of Done**:
  1. Introduce reusable buffers/helpers (e.g., a `ComponentManager` snapshot iterator or cached entity scratch maps) so `IOPlayer.createFrameSnapshot` avoids rebuilding temporary arrays/maps each tick.
  2. Adjust `FrameFilter` (and related code) to skip unnecessary shallow copies when no blacklist is active while still preventing callers from mutating internal state.
  3. Add regression tests proving frame payloads remain correct and isolated across ticks, then run unit tests, integration script, and grab indicative benchmarks noting memory deltas.

## Task 5: Re-benchmark and Document Gains
- **Lifecycle**: Phase 5 Optimization — Step 5 (Validation & Documentation)
- **Mindset**: Integrator
- **Workspace**: `tools/benchmark_simulation.js`, `verifications/`, `memory/records/`, `README.md` (if changes surfaced).
- **Guardrails**:
  - `instruction_documents/Describing_Simulation_0_schedule_of_work.md` — Validation and reporting requirements.
  - Fast-cycle benchmarking harness from Task 2.
  - Verification logging conventions in `verifications/README.md`.
- **Objective**: Quantify the cumulative runtime/memory improvements and ensure the optimized build passes the established verification envelope.
- **Definition of Done**:
  1. Run `npm --prefix workspaces/Describing_Simulation_0 test`, `./tools/run_integration.sh`, and the benchmark harness (including the fast-cycle configuration). Persist new artefacts in `verifications/` with timestamps.
  2. Produce a memory record summarizing baseline vs. improved metrics, residual risks, and any follow-up optimization ideas.
  3. Confirm README/information routes remain accurate post-optimization, noting explicitly if no updates were necessary.
