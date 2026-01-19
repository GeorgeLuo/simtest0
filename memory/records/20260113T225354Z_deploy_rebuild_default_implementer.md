# Deploy rebuild default (implementer)

- Switched deploy start to rebuild by default (unless `--no-build`) to avoid stale dist usage.
- Updated CLI help and README language to reflect the new rebuild-by-default behavior.

Done-ness: deploy start now runs a build every time unless explicitly skipped; no tests run.
