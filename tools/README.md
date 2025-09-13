# Tools

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
