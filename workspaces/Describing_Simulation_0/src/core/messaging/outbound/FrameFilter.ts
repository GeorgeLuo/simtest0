import type { ComponentType } from "../../components/ComponentType";
import type { FrameComponentFilter } from "./Frame";

export interface FrameFilterOptions {
  allow?: ReadonlyArray<string>;
  block?: ReadonlyArray<string>;
  predicate?: FrameComponentFilter;
  redact?: (type: ComponentType<unknown>, value: unknown) => unknown;
}

export class FrameFilter {
  private readonly allow?: Set<string>;
  private readonly block?: Set<string>;
  private readonly predicate: FrameComponentFilter;
  private readonly redactFn: (type: ComponentType<unknown>, value: unknown) => unknown;

  constructor(options?: FrameFilterOptions) {
    this.allow = options?.allow ? new Set(options.allow) : undefined;
    this.block = options?.block ? new Set(options.block) : undefined;
    this.predicate = options?.predicate ?? (() => true);
    this.redactFn = options?.redact ?? ((type, value) => value);
  }

  shouldInclude(type: ComponentType<unknown>, value: unknown): boolean {
    const typeId = String((type as ComponentType<unknown>).id ?? "");

    if (this.block?.has(typeId)) {
      return false;
    }

    if (this.allow && !this.allow.has(typeId)) {
      return false;
    }

    return this.predicate(type, value);
  }

  transform(type: ComponentType<unknown>, value: unknown): unknown {
    return this.redactFn(type, value);
  }
}
