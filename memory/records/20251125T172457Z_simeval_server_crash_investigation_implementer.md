# Task Record — Simeval server crash investigation

## Summary
- Investigated the localhost:3000 crash; log showed ENOENT for `instruction_documents/Describing_Simulation_0_api_map.md` thrown from `src/routes/information.ts`.
- Determined the runtime was still pointing at legacy instruction filenames; `instruction_documents/Describing_Simulation_0_api_map.md` was removed during the simeval rename while `dist/main.js` still references the old name.
- Confirmed current source uses the simeval-prefixed filenames and serves information docs successfully when started with `ts-node`.

## Actions
- Reviewed instruction indices and the implementer mindset prompt for context.
- Read `verifications/simeval_start_20251119T212653Z.log` and traced the stack to the information route attempting to read the missing API map file.
- Verified only `Describing_Simulation_0_simeval_api_map.md` exists under `instruction_documents` and that `workspaces/Describing_Simulation_0/dist/main.js` still hard-codes the legacy filename.
- Started the server via `ts-node` on port 4101 and fetched `/api/information/api.md` to confirm the new document path works, then shut the server down.

## Validation
- `npx ts-node -e "const { start } = require('./src/main'); (async () => { const server = await start({ port: 4101, host: '127.0.0.1', autoStartEvaluation: false }); const res = await fetch('http://127.0.0.1:4101/api/information/api.md'); console.log('status', res.status); await server.stop?.(); })();"` returned status 200 and exited cleanly.
