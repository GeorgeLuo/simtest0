# CLI vs Dev Tools Split

The CLI under `tools/cli/` is the user-facing interface; developer utilities live under `tools/dev/` and are only referenced for internal verification.

- User-facing workflows should use `simeval` (or `tools/cli/simeval_cli.js`) for deployment, playback, plugin upload, streaming, UI control, and fleet/morphcloud orchestration.
- Dev-only scripts live under `tools/dev/` (start, integration, benchmark, capture, plugin cleanup, stream filter) and are referenced only in internal verification guidance.
- `tools/index.md` is the contract for this layout; any new tooling must land under the correct subtree and be documented there.
