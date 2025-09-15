# Tools Directory

This directory collects helper scripts and utilities that support working with the simulation project, such as automation for data preparation, validation, or analysis workflows.

## Current Contents

- `setup_workspace.sh`: Initializes a workspace with standard `src` and `tests` directories so new projects start with a consistent layout.

  ```bash
  ./tools/setup_workspace.sh workspaces/Describing_Simulation_0
  ```

## Planned Additions

- Environment setup helpers for quickly provisioning local workspaces.
- Data inspection or reporting scripts that summarize simulation outputs.
- Automation to orchestrate recurring maintenance or CI tasks.
