# simtest0

SimEval server workspace plus CLI tooling.

## Repository Layout

- `workspaces/Describing_Simulation_0/` — SimEval server (TypeScript; `dist/main.js` runtime).
- `tools/simeval_cli.js` — CLI (deploy, plugin upload, playback, stream capture, runs).
- `tools/morphcloud_distributor.js` — fleet CLI for provisioning Morphcloud SimEval servers and dispatching remote commands.
- `tools/start.sh` — Quick-start helper for local development.
- `tools/` — Supporting scripts (integration, benchmarking, validation).

## Quick Start

```bash
git clone <repo-url>
cd simtest0

# Install workspace deps
npm --prefix workspaces/Describing_Simulation_0 install

# Start a server (auto-builds if needed)
node tools/simeval_cli.js deploy start --port 3000 --clean-plugins

# Verify
node tools/simeval_cli.js health --server http://127.0.0.1:3000/api
```

## CLI Install

Install the CLIs globally with npm (Node 18+ required):

```bash
npm install -g .
```

Then use:

```bash
simeval deploy start --port 3000 --clean-plugins
simeval health --server http://127.0.0.1:3000/api
simeval-morphcloud list
```

Notes:
- The global install bundles the workspace so `deploy start` can use the default path.
- To keep the CLIs tied to a working copy during development, use `npm link` or a symlink.
- If you want to point at a different workspace, pass `--workspace <path>` or set `SIMEVAL_WORKSPACE`.
 - The Morphcloud distributor is also available under `simeval morphcloud ...`.

## Deploy Management

```bash
simeval deploy start --port 4000 --clean-plugins
simeval deploy list
simeval deploy stop --port 4000
```

Notes:
- `deploy start` auto-builds unless you pass `--no-build`.
- `--clean-plugins` deletes plugin files under `plugins/` (keeps `.gitkeep`) to avoid stale
  plugin confusion after restarts.
- Deploy state is tracked in `~/.simeval/deployments.json`, logs in `~/.simeval/logs/`.

## Morphcloud Distributor

The distributor provisions multiple Morphcloud instances from a snapshot, ships the local
SimEval workspace (build mode), and records instances in `~/.simeval/morphcloud.json`.
It also wraps `simeval_cli.js` for multi-instance operations. The installed binary is
`simeval-morphcloud` (alias `morphcloud-distributor`).

```bash
# Provision three fresh instances from a base snapshot
simeval-morphcloud provision --snapshot snapshot_abc --count 3

# List tracked instances
simeval-morphcloud list

# Run a SimEval command across the fleet
simeval-morphcloud simeval --all -- status

# Stop all instances and keep them in state
simeval-morphcloud stop --all
```

The same commands can be invoked via `simeval morphcloud ...`.

Notes:
- `provision` runs `morphcloud update` by default (use `--skip-update` to skip).
- Use `--mode clone` to clone an existing ready snapshot instead of shipping the workspace.
- Pass extra flags to the underlying scripts after `--` (for example `-- --skip-tests`).

## Plugin Workflow (High-Level)

1) Upload plugin source (writes file to `plugins/`):
   ```bash
   simeval plugin upload --source ./mySystem.js --dest plugins/simulation/systems/mySystem.js
   ```
2) Inject into the runtime:
   ```bash
   simeval system inject --player simulation --module plugins/simulation/systems/mySystem.js --export createSystem
   ```

The codebase API lists files on disk; runtime injection is separate.
