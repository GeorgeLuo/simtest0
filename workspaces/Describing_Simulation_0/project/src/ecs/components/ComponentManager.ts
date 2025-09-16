// Oversees storage and retrieval of component instances across entities.
import type { ComponentType } from './ComponentType.js';

type ComponentRecord<T> = {
  type: ComponentType<T>;
  instances: Map<number, T>;
};

type AnyComponentRecord = ComponentRecord<unknown>;

export class ComponentManager {
  // This manager will coordinate component registration, updates, and lookups.
  private readonly registry = new Map<string, AnyComponentRecord>();

  registerType<T>(type: ComponentType<T>): void {
    if (this.registry.has(type.id)) {
      throw new Error(`Component type "${type.id}" is already registered`);
    }

    this.registry.set(type.id, {
      type,
      instances: new Map<number, T>(),
    });
  }

  attachComponent<T>(
    entityId: number,
    type: ComponentType<T>,
    initial: T,
  ): T {
    const record = this.requireRecord(type);

    if (record.instances.has(entityId)) {
      throw new Error(
        `Entity ${entityId} already has an attached component of type "${type.id}"`,
      );
    }

    const component = this.instantiate(type, initial);
    record.instances.set(entityId, component);
    return component;
  }

  getComponent<T>(entityId: number, type: ComponentType<T>): T | undefined {
    const record = this.requireRecord(type);
    return record.instances.get(entityId);
  }

  getComponents(entityId: number): Map<ComponentType<unknown>, unknown> {
    const components = new Map<ComponentType<unknown>, unknown>();

    for (const record of this.registry.values()) {
      if (record.instances.has(entityId)) {
        components.set(record.type, record.instances.get(entityId));
      }
    }

    return components;
  }

  getEntitiesWith<T>(type: ComponentType<T>): number[] {
    const record = this.requireRecord(type);
    return Array.from(record.instances.keys());
  }

  updateComponent<T>(
    entityId: number,
    type: ComponentType<T>,
    updated: T,
  ): T {
    const record = this.requireRecord(type);

    if (!record.instances.has(entityId)) {
      throw new Error(
        `Entity ${entityId} does not have an attached component of type "${type.id}"`,
      );
    }

    const component = this.instantiate(type, updated);
    record.instances.set(entityId, component);
    return component;
  }

  removeComponent<T>(entityId: number, type: ComponentType<T>): boolean {
    const record = this.requireRecord(type);
    return record.instances.delete(entityId);
  }

  removeAllComponents(entityId: number): void {
    for (const record of this.registry.values()) {
      record.instances.delete(entityId);
    }
  }

  private requireRecord<T>(type: ComponentType<T>): ComponentRecord<T> {
    const record = this.registry.get(type.id);

    if (!record) {
      throw new Error(`Component type "${type.id}" is not registered`);
    }

    return record as ComponentRecord<T>;
  }

  private instantiate<T>(type: ComponentType<T>, initial: T): T {
    return type.create ? type.create(initial) : initial;
  }
}
