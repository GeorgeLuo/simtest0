import { describe, expect, it, vi } from "vitest";
import { Bus } from "../messaging/Bus.js";

describe("Bus", () => {
  it("dispatches messages to subscribers", () => {
    const bus = new Bus<string>();
    const listener = vi.fn();

    bus.subscribe(listener);
    bus.publish("hello");

    expect(listener).toHaveBeenCalledWith("hello");
  });

  it("supports unsubscribe", () => {
    const bus = new Bus<string>();
    const listener = vi.fn();

    const unsubscribe = bus.subscribe(listener);
    unsubscribe();
    bus.publish("hello");

    expect(listener).not.toHaveBeenCalled();
  });

  it("handles per-message payloads", () => {
    const bus = new Bus<number>();
    const listener = vi.fn();

    bus.subscribe(listener);
    bus.publish(1);
    bus.publish(2);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0][0]).toBe(1);
    expect(listener.mock.calls[1][0]).toBe(2);
  });
});
