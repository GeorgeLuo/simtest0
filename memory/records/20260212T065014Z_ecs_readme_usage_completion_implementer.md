# Task Record — Complete ECS package README usage coverage (implementer)

## Summary
- Completed and retained a broader `packages/ecs/README.md` usage guide so it covers package installation and day-to-day ECS usage, not only `EvaluationPlayer` frame injection.
- Ensured documentation aligns with the published package name `@georgeluo/ecs`.

## Context
- User flagged that README looked incomplete and focused mostly on evaluation APIs.
- The usage expansion existed locally but had not been committed yet.

## Actions
- Expanded/kept sections in `packages/ecs/README.md`:
  - Install (`npm`, `pnpm`, `yarn`, local file dependency)
  - Import surface example from `@georgeluo/ecs`
  - `SimulationPlayer` quick start
  - Inbound bus control messages (`start`/`pause`/`stop`)
  - Custom component/system example
  - `EvaluationPlayer` system injection and frame injection (bus/direct)
  - API surface summary

## Validation
- Verified README content includes both simulation and evaluation usage paths.

## Notes
- This record captures documentation completeness for new users cloning the repo and for npm consumers.
