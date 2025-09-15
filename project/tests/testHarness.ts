type TestFn = () => void;

type RecordedTest = {
  suite: string;
  name: string;
  fn: TestFn;
};

let currentSuite: string | undefined;
const tests: RecordedTest[] = [];

export const describe = (suite: string, fn: () => void): void => {
  const previousSuite = currentSuite;
  currentSuite = suite;
  fn();
  currentSuite = previousSuite;
};

export const it = (name: string, fn: TestFn): void => {
  if (!currentSuite) {
    throw new Error('it() must be called within describe()');
  }
  tests.push({ suite: currentSuite, name, fn });
};

const formatValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) {
    return true;
  }

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }

    return a.every((value, index) => deepEqual(value, b[index]));
  }

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);

  if (keysA.length !== keysB.length) {
    return false;
  }

  return keysA.every((key) =>
    Object.prototype.hasOwnProperty.call(b, key) && deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
};

class Expectation<T> {
  constructor(private readonly actual: T, private readonly isNot = false) {}

  get not(): Expectation<T> {
    return new Expectation(this.actual, !this.isNot);
  }

  private assert(condition: boolean, message: string): void {
    const passes = this.isNot ? !condition : condition;
    if (!passes) {
      throw new Error(message);
    }
  }

  toBe(expected: unknown): void {
    this.assert(
      Object.is(this.actual, expected),
      `Expected ${formatValue(this.actual)} to ${this.isNot ? 'not ' : ''}be ${formatValue(expected)}`
    );
  }

  toEqual(expected: unknown): void {
    this.assert(
      deepEqual(this.actual, expected),
      `Expected ${formatValue(this.actual)} to ${this.isNot ? 'not ' : ''}deeply equal ${formatValue(expected)}`
    );
  }

  toBeUndefined(): void {
    this.assert(this.actual === undefined, `Expected ${formatValue(this.actual)} to ${this.isNot ? 'not ' : ''}be undefined`);
  }

  toThrow(): void {
    if (typeof this.actual !== 'function') {
      throw new Error('Actual value is not callable');
    }

    let threw = false;
    try {
      (this.actual as () => unknown)();
    } catch {
      threw = true;
    }

    this.assert(threw, 'Expected function to throw an error');
  }

  toThrowError(): void {
    this.toThrow();
  }
}

export const expect = <T>(value: T): Expectation<T> => new Expectation(value);

export const run = (): void => {
  let failures = 0;

  for (const test of tests) {
    try {
      test.fn();
      console.log(`\u2714 ${test.suite} :: ${test.name}`);
    } catch (error) {
      failures += 1;
      console.error(`\u2716 ${test.suite} :: ${test.name}`);
      if (error instanceof Error) {
        console.error(error.stack ?? error.message);
      } else {
        console.error(error);
      }
    }
  }

  console.log(`\n${tests.length - failures}/${tests.length} tests passed`);

  if (failures > 0) {
    throw new Error('Test failures encountered');
  }
};
