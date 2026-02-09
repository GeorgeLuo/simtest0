# simtest0

SimEval server workspace plus CLI tooling.

## Repository Layout

- `workspaces/Describing_Simulation_0/` — SimEval server (TypeScript; `dist/main.js` runtime).
- `packages/ecs/` — reusable ECS library package (`@simeval/ecs`).
- `tools/cli/simeval_cli.js` — CLI (deploy, plugins, playback, stream capture/forward/upload, UI control, run metadata, codebase, wait, config, log, fleet).
- `tools/cli/morphcloud_distributor.js` — fleet CLI for provisioning Morphcloud SimEval servers and dispatching remote commands.
- `tools/dev/start.sh` — Quick-start helper for local development.
- `tools/dev/` — Supporting scripts (integration, benchmarking, validation).

## Quick Start

```bash
git clone <repo-url>
cd simtest0

# Install workspace deps
npm --prefix workspaces/Describing_Simulation_0 install
npm --prefix packages/ecs install

# Start a server (rebuilds by default)
./tools/cli/simeval_cli.js deploy start --port 3000 --clean-plugins

# Verify
./tools/cli/simeval_cli.js health --server http://127.0.0.1:3000/api
```

## ECS Library

`@simeval/ecs` is the canonical ECS implementation.

- Source: `packages/ecs/src/`
- Build output: `packages/ecs/dist/`
- Package entry: `packages/ecs/src/index.ts`

Compatibility note:
- `workspaces/Describing_Simulation_0/src/core/**` is intentionally retained as shim files that re-export from `@simeval/ecs`.
- This preserves the original workspace/spec path layout while keeping one real implementation.

Build the ECS package locally:
```bash
npm --prefix packages/ecs run build
```

Publish workflow (from `packages/ecs/`):
```bash
npm publish
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
simeval fleet --config fleet.json --ui ws://localhost:5050/ws/control
```

Notes:
- The global install bundles the workspace so `deploy start` can use the default path.
- To keep the CLIs tied to a working copy during development, use `npm link` or a symlink.
- If you want to point at a different workspace, pass `--workspace <path>` or set `SIMEVAL_WORKSPACE`.
- The Morphcloud distributor is also available under `simeval morphcloud ...`.

## CLI Overview

Use `simeval --help` (or `./tools/cli/simeval_cli.js --help` in this repo) for the full list.

Global options:
- `--server` (default: `http://127.0.0.1:3000/api`)
- `--token` (Bearer prefix optional)
- `--cli-config` (path to a CLI config JSON; defaults to `~/.simeval/config.json`)
- `--run` (path to a run directory or `run.json`)

Commands:
- `health`, `status`
- `start | pause | stop`
- `system inject|eject`, `component inject|eject`
- `plugin upload`
- `stream capture|forward|upload`
- `ui <command>`
- `config show|set`
- `run create|show|record`
- `wait`
- `deploy start|stop|list`
- `morphcloud <command>`
- `fleet`
- `log list|view`
- `codebase tree|file`

## CLI config

The CLI auto-loads `~/.simeval/config.json` and uses it as defaults
(CLI flags still override). You can point elsewhere with `--cli-config`.

Example:
```json
{
  "server": "http://127.0.0.1:3000/api",
  "token": "REPLACE_ME",
  "fleetConfig": "fleet.json",
  "snapshot": "SNAPSHOT_ID",
  "workspace": "/path/to/workspaces/Describing_Simulation_0",
  "uiDir": "Stream-Metrics-UI",
  "uiHost": "127.0.0.1",
  "uiPort": 5050,
  "uiMode": "dev"
}
```

Notes:
- `fleetConfig` is used when `simeval fleet` runs without `--config`.
- `snapshot` is used as the default for `simeval morphcloud provision`.
- `workspace` is used as the default for `simeval deploy start` (relative paths resolve from the CLI config file).
- `uiDir` and friends define defaults for `simeval ui serve`.
- Use `--cli-config /path/to/config.json` to point at a different file.

You can also manage the file via CLI:
```bash
simeval config set --token "$SIMEVAL_API_TOKEN" --snapshot SNAPSHOT_ID --fleet-config verification/fleet_highmix.json \
  --workspace /path/to/workspaces/Describing_Simulation_0
simeval config show
```
This writes to `~/.simeval/config.json` unless you pass `--cli-config`.

## Deploy Management

```bash
simeval deploy start --port 4000 --clean-plugins
simeval deploy list
simeval deploy stop --port 4000
```

Notes:
- `deploy start` rebuilds unless you pass `--no-build`.
- `--clean-plugins` deletes plugin files under `plugins/` (keeps `.gitkeep`) to avoid stale
  plugin confusion after restarts.
- `deploy start` also accepts `--log`, `--log-dir`, `--state`, `--force`, and `--auto-start-eval`.
- `deploy start --wait` polls `/health` and fails if the process exits or times out.
- `deploy stop` accepts `--pid`, `--all`, `--signal`, and `--timeout`.
- Deploy state is tracked in `~/.simeval/deployments.json`, logs in `~/.simeval/logs/`.

## Morphcloud Distributor

The distributor provisions multiple Morphcloud instances from a snapshot, ships the local
SimEval workspace (build mode), and records instances in `~/.simeval/morphcloud.json`.
It also wraps `simeval_cli.js` for multi-instance operations. The installed binary is
`simeval-morphcloud` (alias `morphcloud-distributor`).

```bash
# Provision three fresh instances from a base snapshot
simeval-morphcloud provision --snapshot SNAPSHOT_ID --count 3

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

## Stream Capture + Metrics UI

Start the Metrics UI (auto-starts if not already running):
```bash
simeval ui serve --ui-dir Stream-Metrics-UI
```

Capture to file:
```bash
simeval stream capture --stream evaluation --frames 200 --out evaluation.jsonl
```

Forward a live stream into the UI:
```bash
simeval stream forward --stream evaluation --frames 200 --ui ws://localhost:5050/ws/control
```

Upload an existing capture into the UI:
```bash
simeval stream upload --file evaluation.jsonl --ui http://localhost:5050
```

Control the UI over WebSocket:
```bash
simeval ui components --ui ws://localhost:5050/ws/control
simeval ui select --capture-id live-a --path '["1","highmix.metrics","shift_capacity_pressure","overall"]' --ui ws://localhost:5050/ws/control
simeval ui play --capture-id live-a --ui ws://localhost:5050/ws/control
```

Shut down the UI server:
```bash
simeval ui shutdown --ui http://localhost:5050
```

Notes:
- `stream capture` and `stream forward` require `--frames` or `--duration` (ms).
- `--component` and `--entity` filter frames to a single component/entity.
- `--path` accepts a JSON array so dotted keys are unambiguous.
- `stream forward` runs in the background by default and writes a log file (use `--foreground` to block).
- `ui serve` defaults to `127.0.0.1:5050` and runs `npm install` if needed (use `--skip-install` to disable). It runs in the background and writes a log file.

## Run Metadata

```bash
simeval run create --name demo --server http://127.0.0.1:3000/api
simeval run record --run runs/run-123 --frames 200 --stream evaluation
simeval run show --run runs/run-123
```

Notes:
- `run record` starts playback unless you pass `--no-start`.
- Use `--pause` to pause instead of stop, or `--no-stop` to skip stopping.

## Wait for State

```bash
simeval wait --state running --player simulation --timeout 30000 --interval 500
```

## Fleet Orchestration (simeval fleet)

The fleet command provisions Morphcloud instances, uploads plugins, injects components/systems,
controls playback, captures streams, and optionally connects the Metrics UI.

Generate a scaffold config:
```bash
simeval fleet scaffold --out fleet.json
```

Example config:
```json
{
  "ui": { "url": "ws://localhost:5050/ws/control", "pollSeconds": 2 },
  "defaults": {
    "snapshot": "SNAPSHOT_ID",
    "mode": "build",
    "provision": { "args": ["--skip-tests"] },
    "playback": { "start": true, "stop": true },
    "plugins": [
      { "source": "../plugins/evaluation/components/metrics.js", "dest": "plugins/evaluation/components/metrics.js", "overwrite": true }
    ],
    "components": [
      { "player": "evaluation", "module": "plugins/evaluation/components/metrics.js", "export": "metrics_component" }
    ],
    "systems": [
      { "player": "evaluation", "module": "plugins/evaluation/systems/metricsSystem.js", "export": "createSystem" }
    ],
    "captures": [
      {
        "stream": "evaluation",
        "frames": 500,
        "out": "verification/fleet_runs/${deployment}/${instance}_evaluation.jsonl"
      }
    ]
  },
  "deployments": [
    { "name": "highmix", "count": 2 }
  ]
}
```

Notes:
- Plugin entries accept a string path (dest inferred from `plugins/`) or `{ source, dest, overwrite }`.
- Capture templates support `${deployment}`, `${instance}`, `${index}`, and `${instanceId}`.
- `captures[].ui` can be `false` to skip UI live streaming; otherwise it inherits `ui.url`.
- `fleet scaffold` writes `fleet.json` by default; use `--force` to overwrite.

## CLI Logs

```bash
simeval log list
simeval log list --type ui
simeval log view --file ui_20260101T120000.log
```

Notes:
- Log files are stored under `~/.simeval/logs/cli` by default.
- Use `--type` to filter (`ui`, `stream_forward`, etc.).

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

## Codebase Exploration

```bash
simeval codebase tree --server http://127.0.0.1:3000/api
simeval codebase tree --server http://127.0.0.1:3000/api --path plugins
simeval codebase file --server http://127.0.0.1:3000/api --path plugins/simulation/systems/example.js
```
