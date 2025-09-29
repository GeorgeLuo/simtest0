# Checkpoint I Tests and Managers

- Converted entity and component test intents into executable Vitest suites covering primitives, entity lifecycle, and component behaviors.
- Implemented `EntityManager` with removal listeners, ordered tracking, and entity lifecycle management.
- Implemented `ComponentType` validation hook and baseline factory behavior.
- Implemented `ComponentManager` with entity/type bookkeeping, duplicate prevention, and automatic cleanup on entity removal.
- Added TypeScript/Vitest project scaffolding inside the workspace and updated `checks.sh` to install dependencies and run the suite.
