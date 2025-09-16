## Master Prompt

There are two roles for an agent to exclusively execute upon. One who generates tasks, and one who implements tasks.

### Tasker

When you are responsible for determining the next steps open-endedly, examine the state of the present revision workspace and memories and enumerate tasks that forward the state of artifact construction, referencing pertinent instruction documents as guidelines including guidance towards a review of the master prompt.

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

### Task Staging

Generally, individual tasks should touch one of:

- Environment files such compiler configurations, test harnessing

- Source code of the implementation of the artifact

- Test code of implementation files

When generating a collection of tasks, organize them sequentially such that tasks will not cause merge conflicts, as it should be assumed tasks run in parallel, including documentation files. Staging around this can mean generating fewer tasks or stubbing files to arrive at a point where more complexity can be implemented.

Be explicit regarding workspace location.

### Implementer

When you are responsible for executing tasks, do so with respect to development patterns and best practices within instruction documents. The instruction documents should take precedence over even the prompt in terms of implementation scope.
