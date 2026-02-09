# Task Record — Rename/publish ECS as @georgeluo/ecs (implementer)

## Summary
- Standardized the ECS package name on `@georgeluo/ecs` (npm-publishable under the maintainer account) and removed remaining `@simeval/ecs` references from the codebase/docs.
- Published `@georgeluo/ecs@0.1.1` to the public npm registry with corrected README instructions.

## Context
- Publishing under `@simeval/ecs` was blocked by npm scope ownership (`@simeval` scope not available/owned).
- We kept workspace/spec path compatibility by retaining `workspaces/Describing_Simulation_0/src/core/**` as shims.

## Actions
- Updated `packages/ecs/package.json`:
  - Renamed package to `@georgeluo/ecs`.
  - Bumped version to `0.1.1`.
- Updated all runtime + shim + test imports from `@simeval/ecs` to `@georgeluo/ecs`.
- Updated docs:
  - `README.md`
  - `workspaces/Describing_Simulation_0/README.md`
  - `packages/ecs/README.md`
- Refreshed workspace and package lockfiles via `npm install`.

## Validation
- `npm --prefix packages/ecs run build` passed.
- `npm --prefix workspaces/Describing_Simulation_0 run build` passed.
- `npm --prefix workspaces/Describing_Simulation_0 test -- --runInBand` passed.
- Quick server smoke run (health/start/pause/stop/status) passed.
- `npm publish` succeeded:
  - `@georgeluo/ecs@0.1.1`
- `npm view @georgeluo/ecs version` returned `0.1.1`.

## Notes
- Consumers that want to keep the import path `@simeval/ecs` can use an npm alias:
  - `"@simeval/ecs": "npm:@georgeluo/ecs@^0.1.1"`
