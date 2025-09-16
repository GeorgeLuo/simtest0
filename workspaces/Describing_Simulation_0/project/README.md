# Describing Simulation 0 Project

This workspace-scoped project hosts the executable artifacts for the "Describing Simulation 0" instructions. It is the place
where narrative specifications from the instruction set are translated into TypeScript modules, associated Vitest suites, and
supporting tooling before they graduate to shared repositories. For background on how these efforts fit into the larger
simulation program, review the [repository index](../../../index.md) alongside the core
[Describing Simulation 0 orientation](../../../Describing_Simulation_0.md) and the
deeper material collected in the [instruction documents index](../../../instruction_documents/index.md).

## Getting Started

1. Ensure you have a recent Node.js runtime (Node 20+ is recommended to align with the pinned `@types/node` definitions).
2. Install local dependencies:
   ```bash
   npm install
   ```
3. Run the automated test suite at any time to check progress:
   ```bash
   npm test
   ```
   The project uses [Vitest](https://vitest.dev/) and is configured to pass even when no tests are defined so that the harness
   can be brought online before implementation details are finalized.

## Repository Layout

- `src/` – TypeScript source organized by subsystem (for example, the `ecs/` folder scaffolds the entity-component-system
  experiments described in the instructions).
  - `ecs/messaging/` – Strongly typed message bus utilities that let systems publish
    and subscribe to structured payloads without losing type safety.
- `tests/` – Vitest suites that encode the behaviors promised in the design notes; mirrors the `src/` structure for clarity.
  - `ecs/messaging/` – Specifications verifying handler registration, dispatch, and
    the compile-time payload guarantees offered by the messaging utilities.
- `package.json` / `package-lock.json` – Dependency manifest and the lockfile that ensures reproducible installs for the
  workspace.
- `tsconfig.json` – TypeScript compiler configuration tuned for authoring modular simulation components.

Keep documentation in sync with the guiding instruction set as new structures are introduced so contributors can trace code
artifacts back to the rationale captured in the shared documents.
