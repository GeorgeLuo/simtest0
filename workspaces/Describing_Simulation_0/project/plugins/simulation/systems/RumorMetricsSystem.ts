import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { System } from '../../../src/core/systems/System';
import {
  RUMOR_METRICS,
  RUMOR_STATE,
  type RumorMetricsComponent,
} from '../components/VillageComponents';

const METRICS_ENTITY_ID = 'rumor-metrics';

/**
 * Aggregates the population state after each simulation tick.
 */
export class RumorMetricsSystem extends System {
  private currentTick = 0;

  constructor(
    private readonly entities: EntityManager,
    private readonly components: ComponentManager,
  ) {
    super();
  }

  protected override onInit(): void {
    if (!this.components.isRegistered(RUMOR_METRICS)) {
      this.components.register(RUMOR_METRICS);
    }

    if (!this.entities.has(METRICS_ENTITY_ID)) {
      this.entities.create(METRICS_ENTITY_ID);
    }

    if (!this.components.hasComponent(METRICS_ENTITY_ID, RUMOR_METRICS)) {
      const initial: RumorMetricsComponent = {
        history: [],
        completed: false,
        completionTick: null,
      };
      this.components.setComponent(METRICS_ENTITY_ID, RUMOR_METRICS, initial);
    }
  }

  protected override update(deltaTime: number): void {
    this.currentTick += 1;

    let ignorant = 0;
    let spreaders = 0;
    let stiflers = 0;
    let newlyInformed = 0;

    const entityIds = this.components.entitiesWithComponent(RUMOR_STATE);
    for (const entityId of entityIds) {
      const state = this.components.getComponent(entityId, RUMOR_STATE);
      if (!state) {
        continue;
      }

      switch (state.status) {
        case 'ignorant':
          ignorant += 1;
          break;
        case 'spreader':
          spreaders += 1;
          if (state.heardTick === this.currentTick) {
            newlyInformed += 1;
          }
          break;
        case 'stifler':
          stiflers += 1;
          break;
        default:
          break;
      }
    }

    const metrics = this.components.getComponent(METRICS_ENTITY_ID, RUMOR_METRICS);
    const history = metrics?.history ?? [];

    const completed = spreaders === 0;
    const completionTick = metrics?.completionTick ?? null;
    const resolvedCompletionTick =
      completionTick ?? (completed ? this.currentTick : null);

    this.components.setComponent(METRICS_ENTITY_ID, RUMOR_METRICS, {
      history: [
        ...history,
        {
          tick: this.currentTick,
          ignorant,
          spreaders,
          stiflers,
          newlyInformed,
        },
      ],
      completed,
      completionTick: resolvedCompletionTick,
    });
  }
}
