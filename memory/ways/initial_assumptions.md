# Initial Architectural Assumptions

This write-once note distills the core architectural expectations for Simulation 0 so that every future contributor begins from the same frame of reference. These assumptions are derived directly from the repository guidance in [Describing_Simulation_0_codifying_simulations.md](../../instruction_documents/Describing_Simulation_0_codifying_simulations.md) and [Describing_Simulation_0_theory.md](../../instruction_documents/Describing_Simulation_0_theory.md).

## ECS-first engine design
- The simulator must be authored strictly through an entity-component-system (ECS) pattern where entities only hold identity, components hold state, and systems are the sole executors of behavior. This modularity keeps agent-authored extensions localized to plugin directories while preserving stable scaffolding interfaces.
- All simulation mechanics are implemented as ECS definitions; downstream services such as prompt handling or analytics remain outside this boundary to maintain clarity about what can mutate the environment.

## Environment semantics assumed for every problem
- Hypotheticals are interpreted as endogenous, temporally comparative scenarios with explicit or implied boundary conditions. Initial states precede the phenomenon being studied so that contrasts over time can be evaluated coherently.
- Time is treated as a foundational driver of change—typically represented through dedicated time components and systems—ensuring that every simulation cycle has a consistent clock for orchestrating state updates.
- Observable conditions are evaluated through ECS-managed signals, enabling the engine to decide when exit criteria or other lifecycle transitions have been satisfied.

## Scaffolding obligations around the ECS core
- A condition evaluator system terminates or advances the simulation loop based on environment signals, ensuring that end conditions remain deterministic.
- Metrics aggregation and querying are provided as part of the scaffolding so that every component state relevant to analysis can be surfaced without custom plumbing in plugins.
- Real-time control is mediated through an engine controller and messaging bus that support commands such as start, pause, stop, entity injection, and component mutation. An HTTP server exposes these controls for agent tool-calling.

## Traceability
- Architectural expectations: [Describing_Simulation_0_codifying_simulations.md](../../instruction_documents/Describing_Simulation_0_codifying_simulations.md)
- Conceptual problem framing: [Describing_Simulation_0_theory.md](../../instruction_documents/Describing_Simulation_0_theory.md)
