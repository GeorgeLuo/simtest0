# Workspace Conventions

Workspace directories provide isolated sandboxes for implementing the active instruction revision. Each subdirectory should align with a specific specification or milestone so that experiments and deliverables stay traceable.

## Organizing Subdirectories
- Create a top-level folder under `workspaces/` for each instruction revision (for example, `Describing_Simulation_0/`).
- Within a workspace, group related drafts, prototypes, and data under descriptive subfolders such as `notes/`, `drafts/`, `experiments/`, or `prototypes/` depending on the artifacts you produce.
- Archive superseded material in an `archive/` or date-stamped directory when it is no longer active to keep the working area focused on the current effort.

## Naming Conventions
- Use snake_case for folder and file names to maintain portability across operating systems.
- Prefix documents that capture chronological progress with ISO-style dates (e.g., `2024-05-18_progress.md`).
- When creating scripts or notebooks, include the intent in the name (e.g., `baseline_parameter_scan.py`) to make their role clear without opening the file.

## Linking Verification Logs
- After running `./checks.sh` or other validation tooling, store the raw output in `verifications/` with a timestamped filename.
- Cross-link relevant verification logs from workspace notes or READMEs so reviewers can quickly trace evidence of successful runs.
- Summaries in the workspace should cite the specific log filename and date to reinforce the documentation-first workflow described in the repository guidelines.
