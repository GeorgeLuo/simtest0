import { ComponentType } from './ComponentType';

/**
 * Stores component instances keyed by entity and component type.
 */
export class ComponentManager {
  private readonly registry = new Map<string, ComponentType<unknown>>();
  private readonly stores = new Map<string, Map<string, unknown>>();
  private readonly entityComponents = new Map<string, Map<ComponentType<unknown>, unknown>>();
  private readonly entityComponentNames = new Map<string, string[]>();

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

    const typed = type as ComponentType<unknown>;
    let entityMap = this.entityComponents.get(entityId);
    if (!entityMap) {
      entityMap = new Map<ComponentType<unknown>, unknown>();
      this.entityComponents.set(entityId, entityMap);
    }

    const hadComponent = entityMap.has(typed);
    entityMap.set(typed, component);

    if (!hadComponent) {
      this.insertComponentName(entityId, typed.name);
    }
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
    const components = this.entityComponents.get(entityId);
    return components ? new Map(components) : new Map();
  }

  getComponentTypeNamesForEntity(entityId: string): string[] {
    const names = this.entityComponentNames.get(entityId);
    return names ? [...names] : [];
  }

  removeComponent(entityId: string, type: ComponentType<unknown>): boolean {
    const store = this.getStore(type);
    const removed = store.delete(entityId);

    if (!removed) {
      return false;
    }

    const entityMap = this.entityComponents.get(entityId);
    if (!entityMap) {
      return true;
    }

    entityMap.delete(type);

    if (entityMap.size === 0) {
      this.entityComponents.delete(entityId);
      this.entityComponentNames.delete(entityId);
    } else {
      this.removeComponentName(entityId, type.name);
    }

    return true;
  }

  removeAllComponents(entityId: string): boolean {
    const entityMap = this.entityComponents.get(entityId);
    if (!entityMap) {
      return false;
    }

    for (const type of entityMap.keys()) {
      const store = this.getStore(type);
      store.delete(entityId);
    }

    this.entityComponents.delete(entityId);
    this.entityComponentNames.delete(entityId);
    return true;
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

  private insertComponentName(entityId: string, typeName: string): void {
    const existing = this.entityComponentNames.get(entityId);
    if (!existing) {
      this.entityComponentNames.set(entityId, [typeName]);
      return;
    }

    if (existing.includes(typeName)) {
      return;
    }

    const updated = [...existing, typeName].sort((a, b) => a.localeCompare(b));
    this.entityComponentNames.set(entityId, updated);
  }

  private removeComponentName(entityId: string, typeName: string): void {
    const existing = this.entityComponentNames.get(entityId);
    if (!existing) {
      return;
    }

    const updated = existing.filter((name) => name !== typeName);
    if (updated.length === 0) {
      this.entityComponentNames.delete(entityId);
    } else {
      this.entityComponentNames.set(entityId, updated);
    }
  }
}
