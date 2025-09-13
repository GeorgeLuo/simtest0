# Tools

## init_workspace.py

Create new workspace directories under `workspaces/`.

### Usage

```bash
python tools/init_workspace.py <workspace_name> [--seed] [--templates TEMPLATE_DIR]
```

- `workspace_name`: Name of the workspace to create.
- `--seed`: Copy template files into the workspace. Templates are read from
  `tools/templates` by default.
- `--templates`: Optional path to an alternate templates directory.

Example:

```bash
python tools/init_workspace.py demo --seed
```

This creates `workspaces/demo` and populates it with any files found in
`tools/templates`.
