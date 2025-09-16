# Simulation Project Overview

This repository captures the working notes and conventions for constructing simulations from natural language prompts. The
primary reference, `Describing_Simulation_0.md`, describes the philosophy, assumptions, and staged methodology for turning
textual specifications into executable models.

## Directory Layout

- `Describing_Simulation_0.md` – master instruction document outlining the simulation-building approach and agent roles.
- `instruction_documents/` – modular excerpts of the master instructions, including the latest guidance on the Player loop, messaging buses, and IO Player orchestration for simulation state visibility.
- `verifications/` – timestamped logs of verification or testing runs (for example, outputs produced by `checks.sh`).
- `index.md` – quick-reference overview of the repository structure and intent (this file).

### Expected companion directories

The master instructions assume additional directories will appear as the project matures:

- `tools/` – scripts and utilities that automate repeatable actions.
- `workspaces/` – implementation work areas scoped to specific revision efforts.
- `memory/` – long- and short-term written records in `ways/` and `records/` subdirectories.

Create these directories and their indices when you begin implementing artifacts so the working tree matches the described
operational flow.
