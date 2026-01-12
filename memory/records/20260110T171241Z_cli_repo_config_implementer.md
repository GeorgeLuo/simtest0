# CLI repo-local config support (implementer)

- Reviewed the simtest0 instruction set and selected the implementer mindset.
- Added a shared CLI config loader and wired it into `simeval_cli.js` for server/token defaults plus fleet config/snapshot fallbacks.
- Updated `morphcloud_distributor.js` to default snapshots from the repo-local config and refreshed help text.
- Added a config example, ignored the real config file, and documented repo-local usage in the README.

Done-ness: CLI can now run self-contained from a repo-local `simeval.config.json` with defaults for token/server/fleetConfig/snapshot; docs and help updated; no tests run.
