export class ComponentManager {
  private components = new Map<number, Map<string, unknown>>();

  addComponent<T>(entity: number, name: string, component: T): void {
    let entityComponents = this.components.get(entity);
    if (!entityComponents) {
      entityComponents = new Map<string, unknown>();
      this.components.set(entity, entityComponents);
    }
    entityComponents.set(name, component);
  }

  removeComponent(entity: number, name: string): void {
    const entityComponents = this.components.get(entity);
    entityComponents?.delete(name);
  }

  getComponent<T>(entity: number, name: string): T | undefined {
    return this.components.get(entity)?.get(name) as T | undefined;
  }

  forEachEntity(callback: (entity: number, components: Map<string, unknown>) => void): void {
    this.components.forEach((components, entity) => callback(entity, components));
  }
}

export default ComponentManager;
