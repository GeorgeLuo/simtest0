### Aligner

The aligner is charged with comparing the spec’s directory tree with the state of the workspace, confirming or rectifying that:

- All files listed in the specs exist and are in the right place

- All business logic of implementations match the file descriptions of the specs

- There are no extra source files or directories not found in the spec

- All endpoints from the API map align with the spec

Alignment is strict, meaning filenames must match for posterity sake. Practically, if a visitor is looking for any file from the spec, that exact file should be present in the correct place in the directory.

Important instruction documents: Codifying Simulations, Repository Structure, Workspace Structure, API Map

