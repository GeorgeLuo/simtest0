# simtest0

SimEval server workspace plus CLI tooling.

## Repository Layout

- `workspaces/Describing_Simulation_0/` — SimEval server (TypeScript; `dist/main.js` runtime).
- `tools/simeval_cli.js` — CLI (deploy, plugin upload, playback, stream capture, runs).
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

## CLI Install (Recommended)

The CLI is a Node 18+ script and resolves the default workspace relative to its own location.
For that reason, a symlink is recommended so the CLI stays tied to the repo path.

```bash
chmod +x tools/simeval_cli.js
mkdir -p ~/bin
ln -s "$(pwd)/tools/simeval_cli.js" ~/bin/simeval
```

Then use:

```bash
simeval deploy start --port 3000 --clean-plugins
simeval health --server http://127.0.0.1:3000/api
```

If you copy the CLI elsewhere, pass `--workspace <repo>/workspaces/Describing_Simulation_0`
or set `SIMEVAL_WORKSPACE` so deploy commands can find the workspace.

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

