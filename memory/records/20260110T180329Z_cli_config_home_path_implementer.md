# CLI config home path default (implementer)

- Switched CLI config defaults from repo-local to `~/.simeval/config.json`.
- Updated help text, error messages, and README documentation to reflect the new default path.
- Kept `--cli-config` override intact for alternate locations.

Done-ness: CLI defaults now persist under the user home directory by default; docs updated; no tests run.
