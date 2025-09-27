import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { System } from '../../../src/core/systems/System';
import {
  RUMOR_STATE,
  SOCIAL_NETWORK,
  VILLAGER_PROFILE,
  type RumorStatus,
} from '../components/VillageComponents';

export interface RumorSpreadingOptions {
  /** Exposure removed from ignorant villagers every tick to model fading memory. */
  readonly exposureDecay?: number;
}

/**
 * Propagates the rumor between villagers based on local social connections.
 */
export class RumorSpreadingSystem extends System {
  private currentTick = 0;

  constructor(
    private readonly entities: EntityManager,
    private readonly components: ComponentManager,
    private readonly options: RumorSpreadingOptions = {},
  ) {
    super();
  }

  protected override onInit(): void {
    for (const type of [VILLAGER_PROFILE, SOCIAL_NETWORK, RUMOR_STATE]) {
      if (!this.components.isRegistered(type)) {
        this.components.register(type);
      }
    }
  }

  protected override update(deltaTime: number): void {
    this.currentTick += 1;

    const spreaders = this.components
      .entitiesWithComponent(RUMOR_STATE)
      .filter((entityId) => this.isActiveSpreader(entityId));

    for (const entityId of spreaders) {
      const profile = this.components.getComponent(entityId, VILLAGER_PROFILE);
      const social = this.components.getComponent(entityId, SOCIAL_NETWORK);
      const state = this.components.getComponent(entityId, RUMOR_STATE);

      if (!profile || !social || !state) {
        continue;
      }

      for (const neighborId of social.neighbors) {
        const neighborState = this.components.getComponent(neighborId, RUMOR_STATE);
        if (!neighborState || neighborState.status !== 'ignorant') {
          continue;
        }

        const neighborProfile = this.components.getComponent(
          neighborId,
          VILLAGER_PROFILE,
        );
        if (!neighborProfile) {
          continue;
        }

        const nextExposure = neighborState.exposure + profile.expressiveness;
        if (nextExposure >= neighborProfile.susceptibility) {
          this.components.setComponent(neighborId, RUMOR_STATE, {
            status: 'spreader',
            exposure: nextExposure,
            heardTick: this.currentTick,
            activeTicks: 0,
          });
        } else {
          this.components.setComponent(neighborId, RUMOR_STATE, {
            ...neighborState,
            exposure: nextExposure,
          });
        }
      }

      const nextActive = state.activeTicks + 1;
      const nextStatus: RumorStatus =
        nextActive >= profile.patience ? 'stifler' : 'spreader';

      this.components.setComponent(entityId, RUMOR_STATE, {
        ...state,
        status: nextStatus,
        activeTicks: nextActive,
      });
    }

    const exposureDecay = this.options.exposureDecay ?? 0.15;
    if (exposureDecay > 0) {
      const entityIds = this.components.entitiesWithComponent(RUMOR_STATE);
      for (const entityId of entityIds) {
        const state = this.components.getComponent(entityId, RUMOR_STATE);
        if (!state || state.status !== 'ignorant' || state.exposure <= 0) {
          continue;
        }

        const decayed = Math.max(0, state.exposure - exposureDecay);
        if (decayed !== state.exposure) {
          this.components.setComponent(entityId, RUMOR_STATE, {
            ...state,
            exposure: decayed,
          });
        }
      }
    }
  }

  private isActiveSpreader(entityId: string): boolean {
    const state = this.components.getComponent(entityId, RUMOR_STATE);
    if (!state || state.status !== 'spreader') {
      return false;
    }

    const social = this.components.getComponent(entityId, SOCIAL_NETWORK);
    if (!social || social.neighbors.length === 0) {
      return false;
    }

    return true;
  }
}
