# Task Record — Codebase tree filter

## Summary
- Implementer mindset: prevented `/codebase/tree` from crawling `node_modules` (and other hidden build caches) so the endpoint no longer hangs on the root request.
- Added a guardrail that rejects direct tree requests into excluded paths and keeps those directories out of the returned tree.

## Actions
- Updated `src/routes/codebase.ts` to skip excluded path segments during tree construction, short-circuit requests targeting them, and share a filter helper to keep entries consistent across recursion.
- Added a unit test covering exclusion filtering and the blocked-path response in `src/routes/__tests__/codebase.test.ts`.

## Validation
- `npm --prefix workspaces/Describing_Simulation_0 test -- --runTestsByPath src/routes/__tests__/codebase.test.ts`
