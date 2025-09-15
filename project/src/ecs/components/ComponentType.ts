export type ComponentValidator<T> = (value: unknown) => value is T;

export class ComponentType<T> {
  private readonly validator?: ComponentValidator<T>;
  private readonly symbol: symbol;

  constructor(public readonly name: string, validator?: ComponentValidator<T>) {
    this.validator = validator;
    this.symbol = Symbol(name);
  }

  get id(): symbol {
    return this.symbol;
  }

  validate(value: unknown): value is T {
    if (!this.validator) {
      return true;
    }

    return this.validator(value);
  }
}
