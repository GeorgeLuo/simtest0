# Instruction Documents Index

## `_theory.md`
- Captures the conceptual framing for simulation design, including assumptions about temporality, endogeneity, and conditionality in hypothetical prompts.
- Formalizes environments, time, and conditions, establishing how natural language hypotheticals map to simulation-ready specifications.
- Concludes with the requirement that form D representations bridge natural language and executable simulations.

## `_codifying_simulations.md`
- Details the rationale for using an entity-component-system architecture and the surrounding scaffolding required for modular simulations.
- Breaks down structural checkpoints covering primitives, systems, orchestration, messaging, IO, and specialized simulation and evaluation players.
- Emphasizes extensibility and signal exposure so agents can implement domain-specific logic via plugins without altering the core engine.

## `_bootstraps.md`
- Directs how to establish the repository structure, split instruction sections, and document their contents for discoverability.
- Specifies supporting directories—tools, workspaces, memory, and verifications—and the expectations for their maintenance.
- Outlines the purpose of long-term "ways" and short-term "records" memories alongside the checks.sh entry point for validations.
