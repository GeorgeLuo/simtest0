import { ComponentManager } from 'src/core/components/ComponentManager';
import { EntityManager } from 'src/core/entity/EntityManager';
import { System } from 'src/core/systems/System';

import {
  MaritimeBlockadeStateComponent,
  OilMarketStateComponent,
} from '../components/OilMarket';

const SECONDS_PER_DAY = 86_400;

function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

/**
 * Computes the physical supply available after accounting for chokepoint
 * disruptions, rerouting progress, and reserve deployments.
 */
export class BlockadeShockSystem extends System {
  constructor(
    private readonly entityId: string,
    private readonly entities: EntityManager,
    private readonly components: ComponentManager,
  ) {
    super();
  }

  protected override onInit(): void {
    if (!this.entities.has(this.entityId)) {
      this.entities.create(this.entityId);
    }

    const blockade = this.components.getComponent(
      this.entityId,
      MaritimeBlockadeStateComponent,
    );

    if (blockade) {
      blockade.reservesRemainingMb = blockade.reservesRemainingMb ?? blockade.reserveVolumeMb;
      blockade.adaptedCapacityMbpd = blockade.adaptedCapacityMbpd ?? 0;
      blockade.availableSupplyMbpd = blockade.availableSupplyMbpd ?? 0;
      blockade.supplyLossMbpd = blockade.supplyLossMbpd ?? 0;
      blockade.reserveUtilizationMbpd = blockade.reserveUtilizationMbpd ?? 0;
    }
  }

  protected override update(deltaSeconds: number): void {
    const market = this.components.getComponent(
      this.entityId,
      OilMarketStateComponent,
    );
    const blockade = this.components.getComponent(
      this.entityId,
      MaritimeBlockadeStateComponent,
    );

    if (!market || !blockade) {
      return;
    }

    const baselineSupply = Math.max(0, market.baselineSupplyMbpd);
    const chokepointShare = clamp01(blockade.chokepointCapacityShare);
    const severity = clamp01(blockade.severity);
    const disruptedFlowMbpd = baselineSupply * chokepointShare * severity;
    const currentAdapted = Number.isFinite(blockade.adaptedCapacityMbpd)
      ? Math.max(0, blockade.adaptedCapacityMbpd)
      : 0;
    const currentReserves = Number.isFinite(blockade.reservesRemainingMb)
      ? Math.max(0, blockade.reservesRemainingMb)
      : blockade.reserveVolumeMb;
    const deltaDays = Math.max(deltaSeconds, 0) / SECONDS_PER_DAY;

    if (!blockade.active) {
      blockade.adaptedCapacityMbpd = disruptedFlowMbpd;
    } else if (deltaDays > 0 && disruptedFlowMbpd > 0) {
      const rerouteRate = Math.max(0, blockade.rerouteRatePerDay);
      const adaptationGain = disruptedFlowMbpd * rerouteRate * deltaDays;
      blockade.adaptedCapacityMbpd = Math.min(
        disruptedFlowMbpd,
        currentAdapted + adaptationGain,
      );
    }

    const regainedCapacityMbpd = blockade.active
      ? Math.max(
          0,
          Math.min(disruptedFlowMbpd, blockade.adaptedCapacityMbpd ?? currentAdapted),
        )
      : disruptedFlowMbpd;

    const remainingLossMbpd = Math.max(0, disruptedFlowMbpd - regainedCapacityMbpd);

    let availableSupply = Math.max(0, baselineSupply - remainingLossMbpd);
    blockade.supplyLossMbpd = remainingLossMbpd;

    let reserveUtilizationMbpd = 0;
    if (
      blockade.active &&
      deltaDays > 0 &&
      blockade.reserveReleaseMbpd > 0 &&
      currentReserves > 0
    ) {
      const potentialReleaseVolume = blockade.reserveReleaseMbpd * deltaDays;
      const actualReleaseVolume = Math.min(potentialReleaseVolume, currentReserves);

      if (actualReleaseVolume > 0 && deltaDays > 0) {
        reserveUtilizationMbpd = actualReleaseVolume / deltaDays;
        blockade.reservesRemainingMb = Math.max(
          0,
          currentReserves - actualReleaseVolume,
        );
      }
    }

    availableSupply += reserveUtilizationMbpd;

    blockade.reserveUtilizationMbpd = reserveUtilizationMbpd;
    blockade.availableSupplyMbpd = availableSupply;
  }
}
