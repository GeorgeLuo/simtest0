export type ComponentTypeId = string;

export interface ComponentState {
  [key: string]: unknown;
}

/**
 * Describes the schema and behavior for a component type.
 */
export abstract class ComponentType<TState extends ComponentState = ComponentState> {
  public constructor(public readonly type: ComponentTypeId) {}

  public abstract create(initialState?: Partial<TState>): TState;

  public abstract clone(state: TState): TState;
}
