# Metrics UI serve command (implementer)

- Added a `simeval ui serve` subcommand that probes a default UI port and launches the Metrics UI if it is not already running.
- Implemented UI serve helpers for port probing, dependency install, and UI directory resolution with defaults (Stream-Metrics-UI in CWD).
- Extended CLI config to store UI defaults (dir/host/port/mode) and updated docs, examples, and CLI help.

Done-ness: UI server can now be started via the CLI with sensible defaults and optional config persistence; no tests run.
