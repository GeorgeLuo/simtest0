# Agent Instructions

- Commit messages should be in the present tense and summarize the change briefly.
- Run available tests or linters for the affected areas before committing.
- Leave the working tree in a clean state after each task.
- Maintain approach-level notes in the `agent_memory/` directory. Use text files to document styles, patterns, or other reusable insights. Update this directory passively whenever user prompts include approach-level information.
- If it takes searching to find a meta level decision from the document, it should be in memory.
- Before coding, review `agent_memory/` and the latest `human_input/Describing_Simulation_8-1-2025.md` to understand the directory structure and required TDD flow.
- Follow the directory layout described in `human_input/Describing_Simulation_8-1-2025.md` (or its latest version): component and system implementations belong under `implementations/` with extensibility in `plugins/`.
- Use the TDD workflow from `Describing_Simulation_8-1-2025.md`: create skeletons, write comment-only tests, convert them into executable tests, implement logic, then run tests until they pass.

These instructions should be reused by any agent contributing to this repository.
