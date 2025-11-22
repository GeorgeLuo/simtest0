# Task Record — Morphcloud builder defaults to no auth

## Summary
- Updated `tools/morphcloud_build_instance.sh` so SimEval deployments ship without an auth token by default, matching the latest infrastructure preference.
- Sample health-check output now omits the Authorization header unless a token is explicitly provided.

## Actions
- Removed the automatic token generation path and documentation that claimed a random token would be issued on each run; `--auth-token` is now opt-in and `--no-auth` remains for clarity.
- Adjusted the provisioning summary to display `<disabled>` when auth is off and conditionally include the `Authorization` header snippet when applicable.

## Validation
- Script inspected via `git diff`; no runtime invocation performed to avoid provisioning churn. The new defaults simply propagate an empty token through existing env templates.
