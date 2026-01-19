# Verification Layers For Change Management (Dev Tools)

This supersedes `verification_layers_for_change_management.md` now that developer scripts live under `tools/dev/`.

- Run `npm --prefix workspaces/Describing_Simulation_0 test` as the default safety net.
- Re-run `./checks.sh` so the canonical verifier log stays current.
- Execute `./tools/dev/run_integration.sh` to prove end-to-end flows before recording completion.
- When touching frame publication, bus wiring, or performance-sensitive code paths, capture throughput and memory deltas with `node tools/dev/benchmark_simulation.js`, persisting results under `verifications/`.
- Treat `tools/index.md` as the contract for required tooling; additions to the verification surface must slot into this sequence.
