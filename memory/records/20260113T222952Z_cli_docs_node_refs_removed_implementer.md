# CLI documentation cleanup (implementer)

- Audited CLI help text and README for Node-specific invocation and replaced examples with the CLI program form (`simeval` or `./tools/simeval_cli.js`).
- Verified no user-specific absolute paths appear in CLI defaults or examples (checked CLI help and README).

Done-ness: CLI documentation no longer instructs running via `node`; no tests run.
