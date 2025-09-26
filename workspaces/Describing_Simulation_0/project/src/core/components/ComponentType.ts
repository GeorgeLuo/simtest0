/**
 * Identifies a component bucket stored by the {@link ComponentManager}.
 */
export class ComponentType<TComponent> {
  constructor(public readonly name: string) {
    if (!name) {
      throw new Error('Component type name must be a non-empty string.');
    }
  }
}
