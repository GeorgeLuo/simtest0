import { promises as fs } from 'fs';
import path from 'path';
import { ComponentManager } from '../../../../src/core/components/ComponentManager';
import { EntityManager } from '../../../../src/core/entity/EntityManager';
import { SystemManager } from '../../../../src/core/systems/SystemManager';
import { SimulationPlayer, type SimulationPlayerOptions } from '../../../../src/core/simplayer/SimulationPlayer';
import { EvaluationPlayer } from '../../../../src/core/evalplayer/EvaluationPlayer';
import { Bus, acknowledge } from '../../../../src/core/messaging';
import { TimeSystem } from '../../../../src/core/systems/TimeSystem';
import { FoodSupplySystem } from '../../systems/FoodSupplySystem';
import { FoodDemandSystem } from '../../systems/FoodDemandSystem';
import { FoodPriceSystem } from '../../systems/FoodPriceSystem';
import { WarImpactSystem } from '../../systems/WarImpactSystem';
import { FOOD_MARKET_ENTITY_ID } from '../../components/FoodSupplyComponent';
import { WAR_ENTITY_ID } from '../../components/WarImpactComponent';
import type { SnapshotFrame } from '../../../../src/core/IOPlayer';

const SECONDS_PER_DAY = 86_400;
const SIMULATION_DAYS = 180;

class ManualSimulationPlayer extends SimulationPlayer {
  constructor(
    entities: EntityManager,
    components: ComponentManager,
    systems: SystemManager,
    inbound: Bus,
    outbound: Bus,
    options: SimulationPlayerOptions = {},
  ) {
    super(entities, components, systems, inbound, outbound, options);
  }

  manualStep(deltaSeconds: number, timestamp: number): void {
    this.systems.tick(deltaSeconds);
    this.onTick(deltaSeconds, timestamp);
  }
}

class ManualEvaluationPlayer extends EvaluationPlayer {
  manualStep(deltaSeconds: number, timestamp: number): void {
    this.systems.tick(deltaSeconds);
    this.onTick(deltaSeconds, timestamp);
  }
}

async function main(): Promise<void> {
  const simulationComponents = new ComponentManager();
  const simulationEntities = new EntityManager(simulationComponents);
  const simulationSystems = new SystemManager();

  const evaluationComponents = new ComponentManager();
  const evaluationEntities = new EntityManager(evaluationComponents);
  const evaluationSystems = new SystemManager();

  const simulationInbound = new Bus();
  const simulationOutbound = new Bus();
  const evaluationOutbound = new Bus();

  const simulationPlayer = new ManualSimulationPlayer(
    simulationEntities,
    simulationComponents,
    simulationSystems,
    simulationInbound,
    simulationOutbound,
    { frameType: 'simulation/frame' },
  );

  const evaluationPlayer = new ManualEvaluationPlayer(
    evaluationEntities,
    evaluationComponents,
    evaluationSystems,
    simulationOutbound,
    evaluationOutbound,
    { frameType: 'evaluation/frame' },
  );

  // Register core systems for the scenario.
  simulationSystems.register(new TimeSystem(simulationEntities, simulationComponents), -10);
  simulationSystems.register(new WarImpactSystem(simulationEntities, simulationComponents), -5);
  simulationSystems.register(new FoodSupplySystem(simulationEntities, simulationComponents), 0);
  simulationSystems.register(new FoodDemandSystem(simulationEntities, simulationComponents), 1);
  simulationSystems.register(new FoodPriceSystem(simulationEntities, simulationComponents), 2);

  // Subscribe to evaluation frames for capture.
  const frames: SnapshotFrame[] = [];
  evaluationOutbound.subscribe((frame) => {
    frames.push(frame as SnapshotFrame);
    return acknowledge();
  });

  // Warm-up initial state by executing a zero-duration tick to initialize systems.
  simulationPlayer.manualStep(0, 0);
  evaluationPlayer.manualStep(0, 0);

  let currentTimestamp = 0;
  for (let day = 0; day < SIMULATION_DAYS; day += 1) {
    currentTimestamp += SECONDS_PER_DAY;
    simulationPlayer.manualStep(SECONDS_PER_DAY, currentTimestamp);
    evaluationPlayer.manualStep(SECONDS_PER_DAY, currentTimestamp);
  }

  simulationPlayer.stop();
  evaluationPlayer.stop();

  const outputDirectory = path.resolve(
    __dirname,
    '../../../../../../verifications/food_prices_war',
  );
  await fs.mkdir(outputDirectory, { recursive: true });

  const outputPath = path.join(outputDirectory, 'raw_output.json');
  const finalState = frames[frames.length - 1];

  const summary = {
    daysSimulated: SIMULATION_DAYS,
    finalPrice: finalState?.payload.entities.find(
      (entity) => entity.id === FOOD_MARKET_ENTITY_ID,
    )?.components?.foodPrice,
    finalSupply: finalState?.payload.entities.find(
      (entity) => entity.id === FOOD_MARKET_ENTITY_ID,
    )?.components?.foodSupply,
    finalDemand: finalState?.payload.entities.find(
      (entity) => entity.id === FOOD_MARKET_ENTITY_ID,
    )?.components?.foodDemand,
    finalWarState: finalState?.payload.entities.find(
      (entity) => entity.id === WAR_ENTITY_ID,
    )?.components?.warImpact,
  };

  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        metadata: {
          scenario: 'food_prices_war',
          secondsPerDay: SECONDS_PER_DAY,
          daysSimulated: SIMULATION_DAYS,
        },
        summary,
        frames,
      },
      null,
      2,
    ),
    'utf-8',
  );
}

main().catch((error) => {
  console.error('Failed to run food prices war simulation:', error);
  process.exitCode = 1;
});
