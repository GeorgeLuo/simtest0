import { ComponentType } from './ComponentType';

/**
 * Stores component instances keyed by entity and component type.
 */
export class ComponentManager {
  private readonly registry = new Map<string, ComponentType<unknown>>();
  private readonly stores = new Map<string, Map<string, unknown>>();

  register<T>(type: ComponentType<T>): void {
    const key = type.name;

    if (this.registry.has(key)) {
      throw new Error(`Component type "${key}" is already registered.`);
    }

    this.registry.set(key, type as ComponentType<unknown>);
    this.stores.set(key, new Map());
  }

  isRegistered(type: ComponentType<unknown> | string): boolean {
    return this.registry.has(this.resolveKey(type));
  }

  setComponent<T>(entityId: string, type: ComponentType<T>, component: T): void {
    const store = this.getStore(type);
    store.set(entityId, component);
  }

  getComponent<T>(entityId: string, type: ComponentType<T>): T | undefined {
    const store = this.getStore(type);
    return store.get(entityId) as T | undefined;
  }

  hasComponent(entityId: string, type: ComponentType<unknown>): boolean {
    const store = this.getStore(type);
    return store.has(entityId);
  }

  getComponentsForEntity(entityId: string): Map<ComponentType<unknown>, unknown> {
    const components = new Map<ComponentType<unknown>, unknown>();

    for (const [typeName, store] of this.stores.entries()) {
      if (!store.has(entityId)) {
        continue;
      }

      const type = this.registry.get(typeName);
      if (!type) {
        continue;
      }

      components.set(type, store.get(entityId));
    }

    return components;
  }

  removeComponent(entityId: string, type: ComponentType<unknown>): boolean {
    const store = this.getStore(type);
    return store.delete(entityId);
  }

  removeAllComponents(entityId: string): boolean {
    let removed = false;
    for (const store of this.stores.values()) {
      removed = store.delete(entityId) || removed;
    }
    return removed;
  }

  registeredTypes(): ComponentType<unknown>[] {
    return Array.from(this.registry.values());
  }

  entitiesWithComponent(type: ComponentType<unknown>): string[] {
    const store = this.getStore(type);
    return Array.from(store.keys());
  }

  private getStore(type: ComponentType<unknown>): Map<string, unknown> {
    const key = this.resolveKey(type);
    const store = this.stores.get(key);
    if (!store) {
      throw new Error(`Component type "${key}" is not registered.`);
    }
    return store;
  }

  private resolveKey(type: ComponentType<unknown> | string): string {
    return typeof type === 'string' ? type : type.name;
  }
}
