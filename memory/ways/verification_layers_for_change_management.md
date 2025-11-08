# Verification Layers For Change Management

Any meaningful modification to the workspace must clear the same layered validation path before we close or delegate a task.

- Run `npm --prefix workspaces/Describing_Simulation_0 test` as the default safety net; Phase 4’s behavioral sweep and Phase 6’s auth rollout (`memory/records/20251007195618_phase4_task2_behavioral_sweep.md`, `memory/records/20251012222000_phase6_task3_auth_rate_limiting.md`) both relied on this baseline.
- Re-run `./checks.sh` so the canonical verifier log at the repo root remains current, echoing the cadence captured in `memory/records/20251007195618_phase4_task2_behavioral_sweep.md`.
- Execute `./tools/run_integration.sh` to prove end-to-end flows—temperature control, SSE streams, and routing—before recording completion; see `memory/records/20251007194255_phase3_task4_integration_proof.md` alongside `tools/run_integration.sh` and `tools/run_integration.js`.
- When touching frame publication, bus wiring, or performance-sensitive code paths, capture throughput and memory deltas with `node tools/benchmark_simulation.js`, persisting results under `verifications/` as in `memory/records/20251010220430_phase5_task5_rebenchmark_summary.md`.
- Treat `tools/index.md` as the contract for required tooling; additions to our verification surface must slot into this sequence and be cited in future records before a task is considered done.

Skipping any layer leaves us blind to regressions already caught in prior phases, so Taskers should plan time for this stack whenever they hand off implementation work.
