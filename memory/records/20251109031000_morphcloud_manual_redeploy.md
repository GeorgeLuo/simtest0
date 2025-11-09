# Task Record — Morphcloud Manual Redeploy

## Summary
- Brought up a fresh Morphcloud instance from `snapshot_ssyff18u`, expanded disk to 2 GB, uploaded the SimEval workspace + instruction docs bundle, and manually provisioned the runtime (Node 20, npm deps, 1 GB swap, systemd service).
- Confirmed the public endpoint `https://simeval-morphvm-nlp78yje.http.cloud.morph.so/api` no longer requires an Authorization header.
- Captured a new no-auth snapshot `snapshot_lokbkqua` for future cloning.

## Actions
- Created `/tmp/simeval_bundle_manual.tar.gz` containing `workspaces/Describing_Simulation_0` and `instruction_documents`.
- Booted `morphvm_nlp78yje` with `--disk-size 2048`, uploaded the bundle, and unpacked it into `/root/Describing_Simulation_0`.
- Installed OS deps, Node.js 20.19.5, added a 1 GB swapfile, ran `npm install` + `npm run build`, configured `/etc/simeval.env` (empty auth token), and set up `simeval.service`.
- Verified service status and endpoint health, then snapshot the instance as `snapshot_lokbkqua`.

## Validation
- `curl https://simeval-morphvm-nlp78yje.http.cloud.morph.so/api` returned the API metadata without auth headers.
- `systemctl status simeval.service` shows the service active and listening on port 3000.

## Follow-ups
- Script automation still needs hardening (disk sizing, bundle handling, Node install retry); revisit `tools/morphcloud_build_instance.sh` once the manual deployment is fully validated.
