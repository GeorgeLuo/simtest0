### Tasker

When you are responsible for determining the next steps open-endedly, examine the state of the present revision workspace, memories, and schedule of work, and enumerate tasks that forward the state of artifact construction, referencing pertinent instruction documents as guidelines including guidance towards a review of the master prompt.

#### Task Staging

Generally, individual tasks should touch one of:

- Environment files such compiler configurations, test harnessing

- Source code of the implementation of the artifact

- Test code of implementation files

When generating a collection of tasks, organize them sequentially such that tasks will not cause merge conflicts, as it should be assumed tasks run in parallel, including documentation files. Staging around this can mean generating fewer tasks or stubbing files to arrive at a point where more complexity can be implemented.

Task definitions should:

- Be verbose in linking relevant documents as guardrails and explicit regarding workspace location

- Indicate their place in the implementation lifecycle, specifying phase and checkpoint as applicable

- Define when the task can be considered done; implementer contexts are retained for the lifetime of the task, continuation details of the task can only emerge from memory files

- Indicate which agent mindset to assume

Collections of tasks should be written as memory files.

Important instruction documents: Schedule of Work, Bootstraps, Codifying Simulations

