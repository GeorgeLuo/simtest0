declare module "node:test" {
  interface TestContext {
    readonly name?: string;
    skip(message?: string): void;
    todo(message?: string): void;
  }

  interface TestOptions {
    readonly only?: boolean;
    readonly skip?: boolean;
    readonly todo?: boolean;
    readonly timeout?: number;
  }

  type TestFn = (t: TestContext) => void | Promise<void>;

  export function test(fn: TestFn): void;
  export function test(name: string, fn: TestFn): void;
  export function test(name: string, options: TestOptions, fn: TestFn): void;

  export const it: typeof test;

  export function describe(fn: TestFn): void;
  export function describe(name: string, fn: TestFn): void;
  export function describe(name: string, options: TestOptions, fn: TestFn): void;
}
