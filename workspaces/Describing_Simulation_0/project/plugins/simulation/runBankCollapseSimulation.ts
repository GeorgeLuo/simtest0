import { promises as fs } from 'fs';
import path from 'path';

import { ComponentManager } from '../../src/core/components/ComponentManager';
import { EntityManager } from '../../src/core/entity/EntityManager';
import { Bus, acknowledge } from '../../src/core/messaging';
import { SimulationPlayer } from '../../src/core/simplayer/SimulationPlayer';
import { SystemManager } from '../../src/core/systems/SystemManager';
import { TimeSystem } from '../../src/core/systems/TimeSystem';
import { EvaluationPlayer } from '../../src/core/evalplayer/EvaluationPlayer';
import type { SnapshotFrame } from '../../src/core/IOPlayer';

import { EnvironmentSetupSystem } from './systems/EnvironmentSetupSystem';
import { BankCollapseSystem } from './systems/BankCollapseSystem';
import { PolicyResponseSystem } from './systems/PolicyResponseSystem';
import { CreditMarketEvolutionSystem } from './systems/CreditMarketEvolutionSystem';
import { CreditMarketSummarySystem } from '../evaluation/systems/CreditMarketSummarySystem';

const SECONDS_PER_DAY = 86_400;
const TARGET_TICKS = 180;

const createTimeProvider = () => {
  let current = 0;
  return () => {
    const now = current;
    current += SECONDS_PER_DAY * 1_000; // milliseconds
    return now;
  };
};

const resolveRepoPath = (...segments: string[]): string =>
  path.resolve(__dirname, '../../../../../', ...segments);

async function runSimulation(): Promise<void> {
  const simulationComponents = new ComponentManager();
  const simulationEntities = new EntityManager(simulationComponents);
  const simulationSystems = new SystemManager();

  simulationSystems.register(new TimeSystem(simulationEntities, simulationComponents), -20);
  simulationSystems.register(
    new EnvironmentSetupSystem(simulationEntities, simulationComponents),
    -15,
  );
  simulationSystems.register(new BankCollapseSystem(simulationComponents), -10);
  simulationSystems.register(new PolicyResponseSystem(simulationComponents), -5);
  simulationSystems.register(new CreditMarketEvolutionSystem(simulationComponents), 0);

  const simulationInboundBus = new Bus();
  const simulationOutboundBus = new Bus();

  const simulationPlayer = new SimulationPlayer(
    simulationEntities,
    simulationComponents,
    simulationSystems,
    simulationInboundBus,
    simulationOutboundBus,
    {
      tickIntervalMs: 1,
      timeProvider: createTimeProvider(),
    },
  );

  const evaluationComponents = new ComponentManager();
  const evaluationEntities = new EntityManager(evaluationComponents);
  const evaluationSystems = new SystemManager();

  evaluationSystems.register(new TimeSystem(evaluationEntities, evaluationComponents), -10);
  evaluationSystems.register(new CreditMarketSummarySystem(evaluationEntities, evaluationComponents), 0);

  const evaluationInboundBus = new Bus();
  const evaluationOutboundBus = new Bus();

  const evaluationPlayer = new EvaluationPlayer(
    evaluationEntities,
    evaluationComponents,
    evaluationSystems,
    evaluationInboundBus,
    evaluationOutboundBus,
    {
      tickIntervalMs: 1,
      timeProvider: createTimeProvider(),
    },
  );

  simulationOutboundBus.subscribe((frame) => evaluationInboundBus.send(frame));

  const evaluationFrames: SnapshotFrame[] = [];
  let resolveRun: (() => void) | null = null;
  const completion = new Promise<void>((resolve) => {
    resolveRun = resolve;
  });

  evaluationOutboundBus.subscribe((frame) => {
    const snapshot = frame as SnapshotFrame;
    evaluationFrames.push(snapshot);

    if (snapshot.metadata.tick >= TARGET_TICKS && resolveRun) {
      simulationInboundBus.send(simulationPlayer.commands.stop, undefined);
      evaluationPlayer.stop();
      resolveRun();
      resolveRun = null;
    }

    return acknowledge();
  });

  evaluationPlayer.start();
  simulationInboundBus.send(simulationPlayer.commands.start, undefined);

  const timeout = setTimeout(() => {
    if (resolveRun) {
      simulationInboundBus.send(simulationPlayer.commands.stop, undefined);
      evaluationPlayer.stop();
      resolveRun();
      resolveRun = null;
    }
  }, 10_000);

  await completion;
  clearTimeout(timeout);

  const outputDir = resolveRepoPath('verifications', 'bank_collapses');
  await fs.mkdir(outputDir, { recursive: true });

  const rawOutputPath = path.join(outputDir, 'raw_output.json');
  await fs.writeFile(rawOutputPath, JSON.stringify(evaluationFrames, null, 2));

  const finalFrame = evaluationFrames[evaluationFrames.length - 1];
  if (finalFrame) {
    // eslint-disable-next-line no-console
    console.log('Final summary snapshot:', JSON.stringify(finalFrame.payload, null, 2));
  }
}

runSimulation().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Simulation failed:', error);
  process.exitCode = 1;
});
