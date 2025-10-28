# Root discoverability improvement (implementer)

## Context
- Addressed outsider feedback that `GET /` returned `404` with no pointers to `/api`.

## Changes
- Updated `src/server.ts` to short-circuit `/` requests with a JSON guidance payload linking to `/api` and `/api/information/api` before delegating to the router.
- Added `normalizeUrlPath` helper to reconcile query strings/trailing slashes.
- Extended `server.test.ts` to cover the new behaviour and re-ran `npm test -- server` (pass).

## Follow-up
- Consider mirroring the guidance payload in integration docs so outsiders know to expect JSON rather than HTML.
- Next mindset: aligner should confirm file structure remains consistent after root route changes.
