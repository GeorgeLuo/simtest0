# Foundational Assumptions

- Simulations will be built with the ECS architecture detailed in `instruction_documents/Describing_Simulation_0_codifying_simulations.md` and must expose signals liberally for downstream consumers.
- Repository tasks must keep `workspaces/Describing_Simulation_0/` as the active implementation surface for this revision, with other directories serving as scaffolding or records.
- Agents coordinate via `memory/` and instruction documents; every task begins with reviewing the latest guidance before planning or coding.
