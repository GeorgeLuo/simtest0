import { strict as assert } from "node:assert";

import { ComponentState, ComponentType } from "../src/ecs/components/ComponentType";
import { DefaultComponentManager } from "../src/ecs/components/implementations/DefaultComponentManager";

interface TestComponentState extends ComponentState {
  value: number;
  nested: {
    flag: boolean;
  };
}

class TestComponent extends ComponentType<TestComponentState> {
  public constructor() {
    super("test");
  }

  public create(initialState: Partial<TestComponentState> = {}): TestComponentState {
    return {
      value: initialState.value ?? 0,
      nested: {
        flag: initialState.nested?.flag ?? false,
      },
    };
  }

  public clone(state: TestComponentState): TestComponentState {
    return {
      value: state.value,
      nested: { flag: state.nested.flag },
    };
  }
}

type TestCase = {
  readonly name: string;
  readonly fn: () => void;
};

const cases: TestCase[] = [];

const test = (name: string, fn: () => void) => {
  cases.push({ name, fn });
};

test("register stores component types and enforces uniqueness", () => {
  const manager = new DefaultComponentManager();
  const component = new TestComponent();

  assert.equal(manager.has(component.type), false);

  manager.register(component);

  assert.equal(manager.has(component.type), true);
  assert.throws(() => manager.register(component));
});

test("attach requires prior registration", () => {
  const manager = new DefaultComponentManager();
  const component = new TestComponent();
  const state = component.create({ value: 5, nested: { flag: true } });

  assert.throws(() => manager.attach("entity-1", component.type, state));
});

test("reads and writes clone component state to prevent mutation leakage", () => {
  const manager = new DefaultComponentManager();
  const component = new TestComponent();
  manager.register(component);

  const originalState = component.create({ value: 7, nested: { flag: true } });
  manager.attach("entity-1", component.type, originalState);

  originalState.value = 42;
  originalState.nested.flag = false;

  const firstSnapshot = manager.read("entity-1", component.type) as TestComponentState;
  assert.equal(firstSnapshot.value, 7);
  assert.equal(firstSnapshot.nested.flag, true);

  firstSnapshot.value = 11;
  firstSnapshot.nested.flag = false;

  const secondSnapshot = manager.read("entity-1", component.type) as TestComponentState;
  assert.equal(secondSnapshot.value, 7);
  assert.equal(secondSnapshot.nested.flag, true);
});

test("detach removes component state and subsequent reads are undefined", () => {
  const manager = new DefaultComponentManager();
  const component = new TestComponent();
  manager.register(component);

  manager.attach("entity-1", component.type, component.create({ value: 3 }));
  manager.detach("entity-1", component.type);

  assert.equal(manager.read("entity-1", component.type), undefined);
});

test("read and detach throw when the component type is unknown", () => {
  const manager = new DefaultComponentManager();

  assert.throws(() => manager.read("entity-1", "missing"));
  assert.throws(() => manager.detach("entity-1", "missing"));
});

let failed = 0;

for (const { name, fn } of cases) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

if (failed > 0) {
  process.exitCode = 1;
}
