import { System } from "../src/ecs/systems/System";
import { TimeComponentState } from "../src/ecs/components/implementations/TimeComponent";
import {
  BasicTimeSystem,
  OrderedSystemManager,
} from "./helpers/concreteImplementations";

class RecordingSystem extends System {
  public readonly id: string;
  public readonly updates: number[] = [];
  public readonly log: string[];
  public initialized = false;
  public shutDown = false;

  public constructor(id: string, log: string[]) {
    super();
    this.id = id;
    this.log = log;
  }

  public initialize(): void {
    this.initialized = true;
    this.log.push(`init:${this.id}`);
  }

  public update(deltaTime: number): void {
    this.updates.push(deltaTime);
    this.log.push(`update:${this.id}`);
  }

  public shutdown(): void {
    this.shutDown = true;
    this.log.push(`shutdown:${this.id}`);
  }
}

describe("OrderedSystemManager", () => {
  it("executes registered systems in deterministic order", () => {
    const manager = new OrderedSystemManager();
    const log: string[] = [];
    const first = new RecordingSystem("first", log);
    const second = new RecordingSystem("second", log);

    manager.register(first);
    manager.register(second);

    manager.run(0.5);

    expect(log.filter((entry) => entry.startsWith("update:"))).toEqual([
      "update:first",
      "update:second",
    ]);
  });

  it("delivers delta time values on each update cycle", () => {
    const manager = new OrderedSystemManager();
    const log: string[] = [];
    const system = new RecordingSystem("delta", log);

    manager.register(system);

    manager.run(0.16);
    manager.run(0.08);

    expect(system.updates).toEqual([0.16, 0.08]);
  });

  it("invokes initialization and shutdown lifecycle hooks", () => {
    const manager = new OrderedSystemManager();
    const log: string[] = [];
    const system = new RecordingSystem("lifecycle", log);

    manager.register(system);

    manager.initializeSystems();
    manager.shutdownSystems();

    expect(system.initialized).toBe(true);
    expect(system.shutDown).toBe(true);
    expect(log).toContain("init:lifecycle");
    expect(log).toContain("shutdown:lifecycle");
  });
});

describe("BasicTimeSystem", () => {
  it("advances the tracked tick when stepped with elapsed time", () => {
    const timeSystem = new BasicTimeSystem();

    timeSystem.initialize();

    timeSystem.step(0.25);
    let state = timeSystem.getState();
    expect(state).toEqual<TimeComponentState>({ tick: 1, delta: 0.25 });

    timeSystem.step(0.5);
    state = timeSystem.getState();
    expect(state).toEqual<TimeComponentState>({ tick: 2, delta: 0.5 });
  });

  it("updates internal state when driven through the update loop", () => {
    const timeSystem = new BasicTimeSystem();

    timeSystem.initialize();
    timeSystem.update(1);

    expect(timeSystem.getState()).toEqual<TimeComponentState>({ tick: 1, delta: 1 });
  });
});
