import fs from 'fs';
import path from 'path';

import { ComponentManager } from '../core/components/ComponentManager';
import { EntityManager } from '../core/entity/EntityManager';
import { SystemManager } from '../core/systems/SystemManager';
import { TimeSystem } from '../core/systems/TimeSystem';
import { SimulationPlayer } from '../core/simplayer/SimulationPlayer';
import { EvaluationPlayer } from '../core/evalplayer/EvaluationPlayer';
import { Bus, acknowledge } from '../core/messaging';
import type { SnapshotFrame } from '../core/IOPlayer';

import {
  RUMOR_METRICS,
  RUMOR_STATE,
  SOCIAL_NETWORK,
  VILLAGER_PROFILE,
  type RumorMetricsComponent,
  type RumorStatus,
  type VillagerProfileComponent,
} from '../../plugins/simulation/components/VillageComponents';
import { RumorSpreadingSystem } from '../../plugins/simulation/systems/RumorSpreadingSystem';
import { RumorMetricsSystem } from '../../plugins/simulation/systems/RumorMetricsSystem';

interface VillagerConfig extends VillagerProfileComponent {
  readonly id: string;
  readonly neighbors: string[];
  readonly initialStatus: RumorStatus;
}

interface SimulationOptions {
  readonly ticks: number;
  readonly tickIntervalMs: number;
  readonly exposureDecay: number;
}

interface SimulationArtifacts {
  readonly frames: SnapshotFrame[];
  readonly villagers: VillagerConfig[];
  readonly options: SimulationOptions;
}

function createDefaultVillagers(): VillagerConfig[] {
  return [
    {
      id: 'amelie',
      name: 'Amélie',
      neighbors: ['bao', 'clara'],
      susceptibility: 1.1,
      expressiveness: 1,
      patience: 3,
      initialStatus: 'spreader',
    },
    {
      id: 'bao',
      name: 'Bao',
      neighbors: ['amelie', 'clara', 'darius'],
      susceptibility: 1.4,
      expressiveness: 0.8,
      patience: 2,
      initialStatus: 'ignorant',
    },
    {
      id: 'clara',
      name: 'Clara',
      neighbors: ['amelie', 'bao', 'elin'],
      susceptibility: 1.2,
      expressiveness: 0.6,
      patience: 3,
      initialStatus: 'ignorant',
    },
    {
      id: 'darius',
      name: 'Darius',
      neighbors: ['bao', 'elin', 'farah'],
      susceptibility: 1.6,
      expressiveness: 0.9,
      patience: 2,
      initialStatus: 'ignorant',
    },
    {
      id: 'elin',
      name: 'Elin',
      neighbors: ['clara', 'darius', 'farah'],
      susceptibility: 1.1,
      expressiveness: 0.5,
      patience: 2,
      initialStatus: 'ignorant',
    },
    {
      id: 'farah',
      name: 'Farah',
      neighbors: ['darius', 'elin'],
      susceptibility: 1.8,
      expressiveness: 0.7,
      patience: 4,
      initialStatus: 'ignorant',
    },
  ];
}

function registerVillagers(
  villagers: VillagerConfig[],
  entities: EntityManager,
  components: ComponentManager,
): void {
  for (const villager of villagers) {
    if (!components.isRegistered(VILLAGER_PROFILE)) {
      components.register(VILLAGER_PROFILE);
    }
    if (!components.isRegistered(SOCIAL_NETWORK)) {
      components.register(SOCIAL_NETWORK);
    }
    if (!components.isRegistered(RUMOR_STATE)) {
      components.register(RUMOR_STATE);
    }

    const entity = entities.create(villager.id);
    components.setComponent(entity.id, VILLAGER_PROFILE, {
      name: villager.name,
      susceptibility: villager.susceptibility,
      expressiveness: villager.expressiveness,
      patience: villager.patience,
    });

    components.setComponent(entity.id, SOCIAL_NETWORK, {
      neighbors: villager.neighbors,
    });

    const initialExposure =
      villager.initialStatus === 'spreader' ? villager.susceptibility : 0;
    const heardTick = villager.initialStatus === 'spreader' ? 0 : null;

    components.setComponent(entity.id, RUMOR_STATE, {
      status: villager.initialStatus,
      exposure: initialExposure,
      heardTick,
      activeTicks: 0,
    });
  }
}

function createMonotonicTimeProvider(stepMs: number): () => number {
  let current = 0;
  return () => {
    current += stepMs;
    return current;
  };
}

async function runSimulation(
  villagers: VillagerConfig[],
  options: SimulationOptions,
): Promise<SimulationArtifacts> {
  const components = new ComponentManager();
  const entities = new EntityManager(components);
  const systems = new SystemManager();

  registerVillagers(villagers, entities, components);

  const timeSystem = new TimeSystem(entities, components);
  const rumorSystem = new RumorSpreadingSystem(entities, components, {
    exposureDecay: options.exposureDecay,
  });
  const metricsSystem = new RumorMetricsSystem(entities, components);

  systems.register(timeSystem, -1);
  systems.register(rumorSystem, 0);
  systems.register(metricsSystem, 1);

  const simulationInbound = new Bus();
  const simulationOutbound = new Bus();
  const evaluationInbound = new Bus();
  const evaluationOutbound = new Bus();

  const simulationPlayer = new SimulationPlayer(
    entities,
    components,
    systems,
    simulationInbound,
    simulationOutbound,
    {
      tickIntervalMs: options.tickIntervalMs,
      timeProvider: createMonotonicTimeProvider(options.tickIntervalMs),
    },
  );

  const evaluationComponents = new ComponentManager();
  const evaluationEntities = new EntityManager(evaluationComponents);
  const evaluationSystems = new SystemManager();

  const evaluationPlayer = new EvaluationPlayer(
    evaluationEntities,
    evaluationComponents,
    evaluationSystems,
    evaluationInbound,
    evaluationOutbound,
    {
      tickIntervalMs: options.tickIntervalMs,
      timeProvider: createMonotonicTimeProvider(options.tickIntervalMs),
    },
  );

  const frames: SnapshotFrame[] = [];
  let simulationCompleted = false;
  let evaluationCaughtUp = false;
  let stopScheduled = false;

  let resolveCompletion: (() => void) | null = null;
  const completionPromise = new Promise<void>((resolve) => {
    resolveCompletion = resolve;
  });

  const finalize = () => {
    if (stopScheduled) {
      return;
    }

    stopScheduled = true;

    setTimeout(() => {
      simulationPlayer.stop();
      evaluationPlayer.stop();
      resolveCompletion?.();
    }, Math.max(options.tickIntervalMs * 2, 10));
  };

  const maybeFinalize = () => {
    if (simulationCompleted && evaluationCaughtUp) {
      finalize();
    }
  };

  simulationOutbound.subscribe((frame) => {
    const snapshot = frame as SnapshotFrame;
    const acknowledgement = evaluationInbound.send(frame);

    const tick = typeof snapshot.metadata.tick === 'number' ? snapshot.metadata.tick : 0;
    if (!simulationCompleted && tick >= options.ticks) {
      simulationCompleted = true;
      maybeFinalize();
    }

    return acknowledgement;
  });

  evaluationOutbound.subscribe((frame) => {
    const snapshot = frame as SnapshotFrame;
    frames.push(snapshot);

    const metricsEntity = snapshot.payload.entities.find(
      (entity) => entity.id === 'rumor-metrics',
    );

    const metrics = metricsEntity?.components?.[RUMOR_METRICS.name] as
      | RumorMetricsComponent
      | undefined;

    const lastEntry = metrics?.history.length
      ? metrics.history[metrics.history.length - 1]
      : undefined;
    const lastTick = lastEntry?.tick ?? 0;
    if (!evaluationCaughtUp && lastTick >= options.ticks) {
      evaluationCaughtUp = true;
      maybeFinalize();
    }

    return acknowledge();
  });

  const safetyTimeout = setTimeout(() => {
    finalize();
  }, options.tickIntervalMs * (options.ticks + 5));

  simulationPlayer.start();
  evaluationPlayer.start();

  await completionPromise;
  clearTimeout(safetyTimeout);

  return { frames, villagers, options };
}

interface CliOptions {
  outputPath?: string;
  ticks?: number;
  tickIntervalMs?: number;
  exposureDecay?: number;
}

function parseCliArguments(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output' && i + 1 < argv.length) {
      options.outputPath = argv[++i];
    } else if (arg === '--ticks' && i + 1 < argv.length) {
      options.ticks = Number.parseInt(argv[++i], 10);
    } else if (arg === '--tick-interval' && i + 1 < argv.length) {
      options.tickIntervalMs = Number.parseInt(argv[++i], 10);
    } else if (arg === '--exposure-decay' && i + 1 < argv.length) {
      options.exposureDecay = Number.parseFloat(argv[++i]);
    }
  }

  return options;
}

async function main(): Promise<void> {
  const args = parseCliArguments(process.argv.slice(2));

  const villagers = createDefaultVillagers();
  const ticks = Number.isInteger(args.ticks) ? (args.ticks as number) : 12;
  const tickIntervalMs = Number.isInteger(args.tickIntervalMs)
    ? (args.tickIntervalMs as number)
    : 10;
  const exposureDecay =
    typeof args.exposureDecay === 'number' ? args.exposureDecay : 0.15;

  const artifacts = await runSimulation(villagers, {
    ticks,
    tickIntervalMs,
    exposureDecay,
  });

  if (args.outputPath) {
    const outputPath = path.resolve(args.outputPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(artifacts, null, 2), 'utf8');
  } else {
    process.stdout.write(`${JSON.stringify(artifacts, null, 2)}\n`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to run village rumor simulation:', error);
    process.exitCode = 1;
  });
}
