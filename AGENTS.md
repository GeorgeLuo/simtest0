# Repository Conventions

These guidelines summarize working agreements for maintaining the Describing Simulation materials. They complement the framing
in `Describing_Simulation_0.md` and its linked instruction documents.

## File Naming
- Use descriptive, lower-case names with underscores for Markdown files that explain simulation processes or repository guides.
- Mirror section titles from the instruction documents when creating companion files so readers can navigate between summaries
  and the source material.

## Commit Scope
- Group related documentation edits into a single commit to preserve traceable updates to specific concepts.
- Avoid bundling unrelated refactors with instruction changes; open a dedicated commit if the instruction documents require a
  structural reorganization.

## Testing Expectations
- This repository is documentation-focused; automated tests are not required.
- Before committing, review Markdown for readability and ensure cross-links resolve to existing files in the repository.
