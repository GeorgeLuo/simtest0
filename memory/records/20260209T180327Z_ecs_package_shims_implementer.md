# Task Record — ECS package shims and docs (implementer)

## Summary
- Converted `workspaces/Describing_Simulation_0/src/core/**` into compatibility shims that re-export from `@simeval/ecs`.
- Kept workspace/spec path layout while removing duplicated ECS implementation logic from the workspace core tree.
- Clarified documentation for new users on canonical source location and install/publish usage.

## Actions
- Replaced all non-test files under `workspaces/Describing_Simulation_0/src/core/**` with thin re-export modules targeting `@simeval/ecs`.
- Updated docs:
  - `README.md` (root): added ECS package section, build/publish notes, and shim explanation.
  - `workspaces/Describing_Simulation_0/README.md`: clarified that `src/core/**` is compatibility-only and canonical ECS source is `packages/ecs/src/**`.
  - `packages/ecs/README.md`: added monorepo layout/shim behavior.
- Maintained package-manager-ready metadata in `packages/ecs/package.json` and verified packaging flow.

## Validation
- `npm --prefix packages/ecs run build` succeeded.
- `npm --prefix workspaces/Describing_Simulation_0 run build` succeeded.
- `npm --prefix workspaces/Describing_Simulation_0 test -- --runInBand` succeeded (all suites passing).
- `npm --prefix packages/ecs pack --json` succeeded with expected files (`dist` + `README.md` + `package.json`).

## Done-ness Evaluation
- ECS now has one canonical implementation path (`packages/ecs/src/**`).
- Legacy core paths remain available for compatibility/spec alignment through shims.
- New contributors have explicit docs on where to edit core code and how to consume/publish the package.
