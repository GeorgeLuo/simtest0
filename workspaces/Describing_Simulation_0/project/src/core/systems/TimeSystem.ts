import { ComponentManager } from '../components/ComponentManager';
import { TIME_COMPONENT, TimeComponent } from '../components/TimeComponent';
import { EntityManager } from '../entity/EntityManager';
import { System } from './System';

/**
 * Maintains a single global time entity whose component accumulates elapsed seconds.
 */
export class TimeSystem extends System {
  private static readonly ENTITY_ID = 'time';
  private timeEntityId: string | undefined;

  constructor(
    private readonly entities: EntityManager,
    private readonly components: ComponentManager
  ) {
    super();
  }

  protected override onInit(): void {
    if (!this.components.isRegistered(TIME_COMPONENT)) {
      this.components.register(TIME_COMPONENT);
    }

    const entity =
      this.entities.get(TimeSystem.ENTITY_ID) ??
      this.entities.create(TimeSystem.ENTITY_ID);

    this.timeEntityId = entity.id;

    if (!this.components.hasComponent(entity.id, TIME_COMPONENT)) {
      this.components.setComponent(entity.id, TIME_COMPONENT, { elapsed: 0 });
    }
  }

  protected override update(deltaTime: number): void {
    if (!this.timeEntityId) {
      throw new Error('Time entity not initialized.');
    }

    const current = this.components.getComponent(this.timeEntityId, TIME_COMPONENT);
    const elapsed = (current?.elapsed ?? 0) + deltaTime;
    const next: TimeComponent = { elapsed };

    this.components.setComponent(this.timeEntityId, TIME_COMPONENT, next);
  }
}
