import { describe, expect, it } from "vitest";
import { System } from "../systems/System.js";

describe("System", () => {
  it("allows subclasses to use default lifecycle hooks without overrides", () => {
    class PassiveSystem extends System {
      update(): void {
        // no-op for test
      }
    }

    const system = new PassiveSystem();

    expect(() => system.onInit()).not.toThrow();
    expect(() => system.onDestroy()).not.toThrow();
  });

  it("invokes subclass update implementation", () => {
    const calls: string[] = [];

    class TestSystem extends System {
      update(): void {
        calls.push("update");
      }
    }

    const system = new TestSystem();
    system.update();

    expect(calls).toEqual(["update"]);
  });
});
