# UI shutdown CLI support (implementer)

- Added a `simeval ui shutdown` subcommand that POSTs to the Metrics UI shutdown endpoint.
- Implemented UI URL normalization for HTTP shutdown requests and allowed fallback to uiHost/uiPort defaults.
- Updated CLI help/examples and README to document the shutdown command.

Done-ness: CLI can now request graceful UI server shutdown; no tests run.
