# HTTP Harness Alignment
- Adjusted simulation/evaluation command routes to return HTTP 400 when command acknowledgements report an error, matching harness expectations.
- Updated server test to assert the new response code contract and reran `npm test` with full pass.
- Verified `tools/run_integration.sh` now completes with the HTTP harness succeeding; artifacts stored in `workspaces/Describing_Simulation_0/verifications/20251002T062054Z/`.
