import { ComponentManager } from '../components/ComponentManager.js';
import { Entity } from '../entity/Entity.js';
import { EntityManager } from '../entity/EntityManager.js';
import { System } from '../systems/System.js';
import { TimeComponentType } from './TimeComponent.js';

/**
 * System responsible for advancing simulation time by incrementing a counter each update.
 */
export class TimeSystem extends System {
  private timeEntity: Entity | null = null;

  constructor(private readonly timeComponent: TimeComponentType = new TimeComponentType()) {
    super('core.time-system');
  }

  override onInit(entityManager: EntityManager, componentManager: ComponentManager): void {
    if (this.timeEntity !== null && entityManager.hasEntity(this.timeEntity)) {
      return;
    }

    const entity = entityManager.createEntity();
    componentManager.addComponent(entity, this.timeComponent, { tick: 0 });
    this.timeEntity = entity;
  }

  override update(entityManager: EntityManager, componentManager: ComponentManager): void {
    let reinitialized = false;
    if (this.timeEntity === null || !entityManager.hasEntity(this.timeEntity)) {
      this.onInit(entityManager, componentManager);
      reinitialized = true;
    }

    if (this.timeEntity === null) {
      return;
    }

    const existing = componentManager.getComponent(this.timeEntity, this.timeComponent);
    if (!existing) {
      componentManager.addComponent(this.timeEntity, this.timeComponent, { tick: 0 });
      return;
    }

    if (reinitialized) {
      return;
    }

    existing.data = { tick: existing.data.tick + 1 };
  }

  override onDestroy(entityManager: EntityManager, _componentManager: ComponentManager): void {
    if (this.timeEntity === null) {
      return;
    }

    if (entityManager.hasEntity(this.timeEntity)) {
      entityManager.removeEntity(this.timeEntity);
    }

    this.timeEntity = null;
  }

  get currentEntity(): Entity | null {
    return this.timeEntity;
  }
}
