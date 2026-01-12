# CLI config command support (implementer)

- Added a `config` command to `simeval_cli.js` for showing and setting repo-local defaults.
- Implemented helpers to read, redact, and update the CLI config file while keeping the token hidden on display.
- Extended CLI config loading to tolerate missing files for config commands and exported path resolution utilities.
- Updated README and help output to document `config show|set` and related options.

Done-ness: CLI can now manage repo-local defaults via `simeval config show|set`, writing to `simeval.config.json`; no tests run.
