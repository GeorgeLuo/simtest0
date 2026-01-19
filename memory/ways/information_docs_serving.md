# Information Document Serving

The informational markdown served by `/information/*` is loaded from disk at request time, but the document list is built at server startup.

- The document catalog (IDs, titles, filenames) is defined in `workspaces/Describing_Simulation_0/src/main.ts` at startup. Changing that list requires a server restart.
- Route handlers read file contents via `fs.readFile` on each request (no in-memory cache), so edits to files on disk are picked up immediately without rebuild/restart.
- The served "Describing_Simulation" document is `instruction_documents/Describing_Simulation_0.md`, not the repo-root `Describing_Simulation_0.md`. Keep those files manually synchronized.
- Builds do not bundle the markdown; deployed servers must update files on disk (or be redeployed) to change served content.
