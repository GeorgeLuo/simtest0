# Describing Simulation — Orientation

This abridged reference points new operators to the broader simulation design notes captured in the repository's `instruction_documents` directory. Use it alongside the API overview to understand how to extend the runtime with new systems, components, and evaluation hooks.

## Core Concepts
- **Entity Component System (ECS)** — Simulation state is modeled through entities that hold typed components; systems iterate over entities to advance time and produce outbound metrics.
- **IO Player** — The base runtime loop that consumes inbound bus operations and publishes filtered frames to outbound subscribers.
- **Evaluation Player** — Extends the IO player to capture injected frames and run evaluation systems/components for downstream analysis.
- **Messaging Buses** — Inbound buses carry control operations, while outbound buses publish frames and acknowledgements for clients or peer players.

## Extension Workflow
1. Inspect the codebase via `/api/codebase/tree` and `/api/codebase/file` to locate extension points under `plugins/`.
2. Author new systems or components following the patterns documented in `instruction_documents/Describing_Simulation_0_simeval_codifying_simulations.md`.
3. Upload the assets through the simulation or evaluation injection endpoints.
4. Start the simulation and observe outbound streams to validate behaviour; rerun uploads as needed.

Additional background, including the full `Describing_Simulation_0.md`, is available under `instruction_documents/`. This file intentionally highlights only the concepts necessary for first-step discoverability.
