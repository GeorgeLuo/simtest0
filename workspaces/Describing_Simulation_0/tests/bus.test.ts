import { describe, expect, it, vi } from "vitest";
import { Bus } from "../src/core/messaging/Bus";

describe("Bus", () => {
  it("notifies subscribers", () => {
    const bus = new Bus<number>();
    const listener = vi.fn();

    bus.subscribe(listener);
    bus.send(42);

    expect(listener).toHaveBeenCalledWith(42);
  });

  it("supports unsubscribe", () => {
    const bus = new Bus<string>();
    const listener = vi.fn();
    const unsubscribe = bus.subscribe(listener);

    unsubscribe();
    bus.send("hello");

    expect(listener).not.toHaveBeenCalled();
  });
});
