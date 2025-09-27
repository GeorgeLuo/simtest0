import { Bus } from './core/messaging/Bus';
import { ComponentManager } from './core/components/ComponentManager';
import { EntityManager } from './core/entity/EntityManager';
import { SystemManager } from './core/systems/SystemManager';
import { SimulationPlayer } from './core/simplayer/SimulationPlayer';
import { EvaluationPlayer } from './core/evalplayer/EvaluationPlayer';
import { createServer } from './server';

async function main(): Promise<void> {
  const simulationComponents = new ComponentManager();
  const simulationEntities = new EntityManager(simulationComponents);
  const simulationSystems = new SystemManager();
  const simulationInbound = new Bus();
  const simulationOutbound = new Bus();

  const evaluationComponents = new ComponentManager();
  const evaluationEntities = new EntityManager(evaluationComponents);
  const evaluationSystems = new SystemManager();
  const evaluationInbound = new Bus();
  const evaluationOutbound = new Bus();

  const simulationPlayer = new SimulationPlayer(
    simulationEntities,
    simulationComponents,
    simulationSystems,
    simulationInbound,
    simulationOutbound,
  );

  const evaluationPlayer = new EvaluationPlayer(
    evaluationEntities,
    evaluationComponents,
    evaluationSystems,
    evaluationInbound,
    evaluationOutbound,
  );

  const server = createServer({
    simulation: {
      player: simulationPlayer,
      inbound: simulationInbound,
      outbound: simulationOutbound,
    },
    evaluation: {
      player: evaluationPlayer,
      inbound: evaluationInbound,
      outbound: evaluationOutbound,
    },
  });

  const configuredPort = process.env.PORT;
  const requestedPort = configuredPort ? Number.parseInt(configuredPort, 10) : 3000;

  if (Number.isNaN(requestedPort)) {
    throw new Error(`Invalid PORT value: ${configuredPort}`);
  }

  const port = await server.listen(requestedPort);

  // eslint-disable-next-line no-console
  console.log(`Simulation server listening on port ${port}`);

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });

  process.on('SIGTERM', () => {
    void shutdown();
  });
}

if (require.main === module) {
  main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start simulation server:', error);
    process.exit(1);
  });
}
