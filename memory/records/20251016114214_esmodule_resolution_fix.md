# ESM Runtime Compatibility Fix

- Switched the TypeScript compiler to `module`/`moduleResolution` = `NodeNext` in `tsconfig.json` to align emitted ESM with Node’s loader semantics.
- Appended `.js` extensions to all relative imports/exports across `src/**` (including tests) so the compiled bundle references resolvable specifiers.
- Rebuilt (`npm run build`) and reran the full test suite (`npm test`); both commands succeeded, confirming the refactor preserved behavior.
