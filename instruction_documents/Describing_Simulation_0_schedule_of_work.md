# Schedule of Work

This section outlines the implementation stages, primarily useful for the tasker to determine units of work.

Phase 1 — Bootstrapping

- Prepare repository structure as described in Bootstraps.

- Split this document into component instruction files.

- Create or update index.md and AGENTS.md for visibility.

- Ensure tools/, workspaces/, and memory/ directories exist.

Phase 2 — Artifact Creation

- Enter the workspace for the current revision.

- Proceed through checkpoints in order.

- Each checkpoint represents a coherent milestone, building on prior ones.

- For each checkpoint:

- Define skeletons (structure, empty methods).

- Write test intents (comment-only).

- Codify tests from intents.

- Implement logic to satisfy tests.

- Validate until all tests pass.

Phase 3 — Integration Test

- Implement integration script

- Run test and correct gaps between execution and spec until all gaps are resolved

- Produce artifacts as proof of implementation correctness

Phase 4 — Structural & Behavioral Alignment

- Check codebase against directory structure

- No described file is un-implemented

- All source code exists in the directory structure

- Descriptions of files match source code

Phase 5 — Optimization

- Inspect codebase for optimizations run-time complexity and memory and refactor, validating changes do not break behavior using the integration test
