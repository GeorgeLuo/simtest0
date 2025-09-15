declare module "node:assert/strict" {
  function strictEqual(actual: unknown, expected: unknown, message?: string | Error): void;
  function deepStrictEqual(actual: unknown, expected: unknown, message?: string | Error): void;

  interface StrictAssert {
    strictEqual: typeof strictEqual;
    deepStrictEqual: typeof deepStrictEqual;
  }

  const assert: StrictAssert;
  export { strictEqual, deepStrictEqual };
  export default assert;
}
