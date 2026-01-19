# CLI workspace config support (implementer)

- Added workspace to the CLI config normalization and `simeval config set` so defaults can be stored in `~/.simeval/config.json`.
- Updated deploy workspace resolution to prefer CLI config defaults before env vars, resolving relative paths from the config file directory.
- Documented the new `workspace` field in README and the example config template.

Done-ness: workspace defaults can now be stored and used by `simeval deploy start`; no tests run.
