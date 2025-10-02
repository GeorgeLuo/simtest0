import { describe, expect, it } from "vitest";
import { FrameFilter } from "../src/core/messaging/outbound/FrameFilter";
import { ComponentType } from "../src/core/components/ComponentType";

describe("FrameFilter", () => {
  const keepType = new ComponentType<{ value: number }>("keep");
  const dropType = new ComponentType<{ value: number }>("drop");

  it("allows filtering by allow list", () => {
    const filter = new FrameFilter({ allow: ["keep"] });

    expect(filter.shouldInclude(keepType, { value: 1 })).toBe(true);
    expect(filter.shouldInclude(dropType, { value: 2 })).toBe(false);
  });

  it("blocks specific components", () => {
    const filter = new FrameFilter({ block: ["drop"] });

    expect(filter.shouldInclude(dropType, { value: 0 })).toBe(false);
    expect(filter.shouldInclude(keepType, { value: 0 })).toBe(true);
  });

  it("applies redaction to included components", () => {
    const filter = new FrameFilter({
      redact: (_type, value) => ({ ...(value as Record<string, unknown>), secret: undefined }),
    });

    const filtered = filter.transform(keepType, { value: 5, secret: "hide" });
    expect(filtered).toEqual({ value: 5, secret: undefined });
  });

  it("supports removing a component by returning undefined", () => {
    const filter = new FrameFilter({
      redact: (_type, _value) => undefined,
    });

    expect(filter.transform(keepType, { value: 1 })).toBeUndefined();
  });
});
