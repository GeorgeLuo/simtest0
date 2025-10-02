export type ComponentId = string;

export class ComponentType<T> {
  readonly id: ComponentId;

  constructor(id: ComponentId) {
    this.id = id;
  }
}

export type ComponentData<T> = T;
