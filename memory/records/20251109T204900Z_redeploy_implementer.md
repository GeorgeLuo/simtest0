# Redeploy & Server Alignment — Implementer

## Summary
- Rebuilt the Morphcloud deployment from `snapshot_l3yumd7g` using the latest workspace bundle, yielding instance `morphvm_p62mulvu` (public URL `https://simeval-morphvm-p62mulvu.http.cloud.morph.so`, auth token `46db0fec3f993beeb775635230f3b40d`).
- Updated `tools/morphcloud_build_instance.sh` so swap provisioning happens before apt installs and the systemd unit gets an explicit restart; this avoids transient OOM/seeded-service issues observed in earlier attempts.
- Verified all 22 canonical endpoints from `Describing_Simulation_0.md` against the new server: informational files exist at `/information/Describing_Simulation.md` + `/information/api.md`, `/simulation/*` and `/evaluation/*` aliases respond, `/codebase/plugin` writes files under `plugins/`, and `/health`/`/status` report runtime state.

## Details
- Script invocation (with `--skip-tests` because the test suite already ran locally): `tools/morphcloud_build_instance.sh --snapshot snapshot_l3yumd7g --name sim-eval-prod --service-name simeval --repo-url https://github.com/GeorgeLuo/simtest0.git --repo-branch main --host 0.0.0.0 --port 3000 --metadata purpose=sim-eval --skip-tests`.
- Provisioning output confirms `systemctl status simeval.service` is active on the VM; `morphcloud instance list` shows the service exposed as `simeval:3000`.
- Post-deploy verification script (Python curl harness) exercised `/`, `/information/*.md`, `/simulation/...`, `/evaluation/...`, `/codebase/...`, `/health`, `/status`, plus SSE streams and plugin upload. Responses matched the spec; module-related errors occurred only where expected (placeholder plugin paths).

## Next
- Future deployments can reuse the same script + snapshot; remember to pass `--skip-tests` only if local tests already ran.
- Aligner can periodically re-run the verification harness to ensure the remote surface remains spec compliant.
