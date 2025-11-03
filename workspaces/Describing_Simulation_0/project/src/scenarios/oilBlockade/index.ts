import fs from 'node:fs/promises';
import path from 'node:path';

import { ComponentManager } from 'src/core/components/ComponentManager';
import { EntityManager } from 'src/core/entity/EntityManager';
import type { SnapshotFrame } from 'src/core/IOPlayer';
import { EvaluationPlayer } from 'src/core/evalplayer/EvaluationPlayer';
import { SimulationPlayer } from 'src/core/simplayer/SimulationPlayer';
import { Bus } from 'src/core/messaging';
import { SystemManager } from 'src/core/systems/SystemManager';

import {
  MaritimeBlockadeStateComponent,
  OilMarketStateComponent,
  type MaritimeBlockadeState,
  type OilMarketState,
} from '../../../plugins/simulation/components/OilMarket';
import { BlockadeShockSystem } from '../../../plugins/simulation/systems/BlockadeShockSystem';
import { OilMarketDynamicsSystem } from '../../../plugins/simulation/systems/OilMarketDynamicsSystem';
import { OilMarketSummaryComponent } from '../../../plugins/evaluation/components/OilMarketSummary';
import { OilMarketSummarySystem } from '../../../plugins/evaluation/systems/OilMarketSummarySystem';

const WORLD_ENTITY_ID = 'global-oil-market';
const SUMMARY_ENTITY_ID = 'market-analytics';
const SIMULATION_DAYS = 120;
const STEP_INTERVAL_MS = 86_400_000; // one day per tick

class ManualClock {
  private current = 0;

  constructor(private readonly stepMs: number) {}

  now(): number {
    const value = this.current;
    this.current += this.stepMs;
    return value;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TimelinePoint {
  day: number;
  pricePerBarrel?: number;
  effectiveSupplyMbpd?: number;
  demandMbpd?: number;
  supplyLossMbpd?: number;
  inventoryMb?: number;
}

function extractWorldSnapshot(frame: SnapshotFrame): TimelinePoint | null {
  const world = frame.payload.entities.find((entity) => entity.id === WORLD_ENTITY_ID);
  if (!world) {
    return null;
  }

  const market = world.components?.['oil.market.state'] as OilMarketState | undefined;
  const blockade = world.components?.['oil.blockade.state'] as
    | MaritimeBlockadeState
    | undefined;

  if (!market) {
    return null;
  }

  return {
    day: frame.metadata.tick,
    pricePerBarrel: market.pricePerBarrel,
    effectiveSupplyMbpd: market.effectiveSupplyMbpd,
    demandMbpd: market.currentDemandMbpd,
    supplyLossMbpd: blockade?.supplyLossMbpd,
    inventoryMb: market.inventoryMb,
  };
}

async function runSimulation(): Promise<void> {
  const simulationComponents = new ComponentManager();
  simulationComponents.register(OilMarketStateComponent);
  simulationComponents.register(MaritimeBlockadeStateComponent);

  const simulationEntities = new EntityManager(simulationComponents);
  simulationEntities.create(WORLD_ENTITY_ID);

  const baselineMarket: OilMarketState = {
    baselineSupplyMbpd: 100,
    baselineDemandMbpd: 100,
    baselinePricePerBarrel: 80,
    pricePerBarrel: 80,
    priceFloorPerBarrel: 40,
    priceCeilingPerBarrel: 220,
    priceSensitivity: 5.5,
    demandElasticity: 0.15,
    supplyElasticity: 0.06,
    demandAdjustmentRate: 0.2,
    supplyAdjustmentRate: 0.12,
    physicalSupplyMbpd: 100,
    effectiveSupplyMbpd: 100,
    currentDemandMbpd: 100,
    inventoryMb: 1_200,
    inventoryDrawCapacityMbpd: 4,
    inventoryReplenishMbpd: 1.2,
    lastInventoryDrawMbpd: 0,
    lastInventoryReplenishMbpd: 0,
  };

  const blockadeState: MaritimeBlockadeState = {
    active: true,
    chokepointCapacityShare: 0.2,
    severity: 0.9,
    rerouteRatePerDay: 0.015,
    reserveReleaseMbpd: 2,
    reserveVolumeMb: 60,
    reservesRemainingMb: 60,
    adaptedCapacityMbpd: 0,
    availableSupplyMbpd: baselineMarket.physicalSupplyMbpd,
    supplyLossMbpd: 0,
    reserveUtilizationMbpd: 0,
  };

  simulationComponents.setComponent(
    WORLD_ENTITY_ID,
    OilMarketStateComponent,
    baselineMarket,
  );
  simulationComponents.setComponent(
    WORLD_ENTITY_ID,
    MaritimeBlockadeStateComponent,
    blockadeState,
  );

  const simulationSystems = new SystemManager();
  simulationSystems.register(
    new BlockadeShockSystem(WORLD_ENTITY_ID, simulationEntities, simulationComponents),
    0,
  );
  simulationSystems.register(
    new OilMarketDynamicsSystem(WORLD_ENTITY_ID, simulationComponents),
    1,
  );

  const evaluationComponents = new ComponentManager();
  evaluationComponents.register(OilMarketStateComponent);
  evaluationComponents.register(MaritimeBlockadeStateComponent);
  evaluationComponents.register(OilMarketSummaryComponent);

  const evaluationEntities = new EntityManager(evaluationComponents);
  evaluationEntities.create(SUMMARY_ENTITY_ID);
  const evaluationSystems = new SystemManager();
  const summarySystem = new OilMarketSummarySystem(
    WORLD_ENTITY_ID,
    SUMMARY_ENTITY_ID,
    evaluationEntities,
    evaluationComponents,
  );
  evaluationSystems.register(summarySystem);

  const simulationInboundBus = new Bus();
  const simulationOutboundBus = new Bus();
  const evaluationInboundBus = new Bus();
  const evaluationOutboundBus = new Bus();

  const simulationClock = new ManualClock(STEP_INTERVAL_MS);
  const evaluationClock = new ManualClock(STEP_INTERVAL_MS);

  const simulationPlayer = new SimulationPlayer(
    simulationEntities,
    simulationComponents,
    simulationSystems,
    simulationInboundBus,
    simulationOutboundBus,
    {
      tickIntervalMs: 1,
      timeProvider: simulationClock.now.bind(simulationClock),
    },
  );

  const evaluationPlayer = new EvaluationPlayer(
    evaluationEntities,
    evaluationComponents,
    evaluationSystems,
    evaluationInboundBus,
    evaluationOutboundBus,
    {
      tickIntervalMs: 1,
      timeProvider: evaluationClock.now.bind(evaluationClock),
    },
  );

  const evaluationFrames: SnapshotFrame[] = [];
  evaluationOutboundBus.subscribe((frame) => {
    evaluationFrames.push(frame as SnapshotFrame);
  });

  let simulationTicks = 0;
  const completion = new Promise<void>((resolve) => {
    simulationOutboundBus.subscribe((frame) => {
      const snapshot = frame as SnapshotFrame;
      evaluationInboundBus.send(snapshot);
      simulationTicks += 1;

      if (simulationTicks >= SIMULATION_DAYS) {
        simulationInboundBus.send(simulationPlayer.commands.stop, undefined);
        resolve();
      }
    });
  });

  evaluationPlayer.start();
  simulationInboundBus.send(simulationPlayer.commands.start, undefined);

  await completion;
  await delay(5);

  if (evaluationFrames.length === 0) {
    throw new Error('Simulation results could not be resolved.');
  }

  const secondsPerDay = 86_400;
  let cumulativePrice = 0;
  let cumulativeGap = 0;
  let totalDays = 0;
  let peakPrice = Number.NEGATIVE_INFINITY;
  let troughPrice = Number.POSITIVE_INFINITY;
  let finalSnapshot: TimelinePoint | null = null;

  for (const frame of evaluationFrames) {
    const snapshot = extractWorldSnapshot(frame);
    if (!snapshot || snapshot.pricePerBarrel === undefined) {
      continue;
    }

    const deltaSeconds =
      typeof frame.metadata?.deltaSeconds === 'number' ? frame.metadata.deltaSeconds : 0;
    const deltaDays = deltaSeconds / secondsPerDay;

    cumulativePrice += snapshot.pricePerBarrel * deltaDays;
    if (
      snapshot.demandMbpd !== undefined &&
      snapshot.effectiveSupplyMbpd !== undefined
    ) {
      cumulativeGap +=
        (snapshot.demandMbpd - snapshot.effectiveSupplyMbpd) * deltaDays;
    }

    totalDays += deltaDays;
    peakPrice = Math.max(peakPrice, snapshot.pricePerBarrel);
    troughPrice = Math.min(troughPrice, snapshot.pricePerBarrel);
    finalSnapshot = snapshot;
  }

  if (!finalSnapshot) {
    throw new Error('Simulation results could not be resolved.');
  }

  evaluationPlayer.stop();
  simulationPlayer.stop();

  const averagePrice =
    totalDays > 0
      ? cumulativePrice / totalDays
      : finalSnapshot.pricePerBarrel ?? 0;
  const averageSupplyGapMbpd =
    totalDays > 0 ? cumulativeGap / totalDays : 0;

  const keyDays = [1, 7, 30, 60, 90, 120];
  const timeline = keyDays.map<TimelinePoint>((day) => {
    const frame = evaluationFrames.find((entry) => entry.metadata.tick === day);
    if (!frame) {
      return { day };
    }

    const snapshot = extractWorldSnapshot(frame);
    return snapshot ?? { day };
  });

  const outputDir = path.resolve(process.cwd(), '../../../verifications/oil_blockade');
  await fs.mkdir(outputDir, { recursive: true });

  const rawOutputPath = path.join(outputDir, 'evaluation_frames.json');
  await fs.writeFile(rawOutputPath, JSON.stringify(evaluationFrames, null, 2));

  const result = {
    simulationDays: SIMULATION_DAYS,
    rawOutputPath,
    summary: {
      finalPrice: finalSnapshot.pricePerBarrel ?? 0,
      peakPrice,
      troughPrice,
      averagePrice,
      finalDemandMbpd: finalSnapshot.demandMbpd ?? 0,
      finalEffectiveSupplyMbpd: finalSnapshot.effectiveSupplyMbpd ?? 0,
      finalSupplyLossMbpd: finalSnapshot.supplyLossMbpd ?? 0,
      averageSupplyGapMbpd,
      remainingInventoryMb: finalSnapshot.inventoryMb ?? 0,
    },
    timeline,
  };

  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  runSimulation().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
