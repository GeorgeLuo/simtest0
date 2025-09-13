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

## Memory script

`memory.py` stores records and ways in the project `memory` directory.

### Add a record

```bash
python tools/memory.py add-record "My Title" "Some content"
```

Creates a file in `memory/records/` with a timestamped, snake_case filename.

### Add a way

```bash
python tools/memory.py add-way "A Way" "Description"
```

Creates a file in `memory/ways/` with a timestamped, snake_case filename.
