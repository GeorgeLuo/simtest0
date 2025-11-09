# Task Record — Morphcloud Instance Builder

## Summary
- Added `tools/morphcloud_build_instance.sh` to automate provisioning of SimEval servers on Morphcloud.
- Script covers instance bootstrapping (snapshot start, swapfile, Node.js install), workspace deployment (git clone, build, optional tests), service wiring, and HTTP exposure.
- Documented the new utility in `tools/index.md`.

## Actions
- Parsed CLI arguments for snapshot, repo details, networking, auth, rate limit, metadata, and exposure preferences.
- Automated remote setup steps through `morphcloud instance ssh`, including NodeSource installation, repository cloning, npm install/build/test, env/systemd configuration, and optional `instance expose-http`.
- Added cleanup handling to stop failed instances automatically unless `--keep-on-failure` is provided.

## Validation
- Verified repository changes via `git status`; live execution would incur new infrastructure so validation is via workflow inspection.

## Follow-ups
- None immediately; run the script with `--snapshot <id>` to create additional environments as needed.
