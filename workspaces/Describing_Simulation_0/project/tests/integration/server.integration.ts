import http from 'http';
import { ComponentManager } from '../../src/core/components/ComponentManager';
import { ComponentType } from '../../src/core/components/ComponentType';
import { EntityManager } from '../../src/core/entity/EntityManager';
import { Bus } from '../../src/core/messaging/Bus';
import type { Frame } from '../../src/core/messaging/outbound/Frame';
import { System } from '../../src/core/systems/System';
import { SystemManager } from '../../src/core/systems/SystemManager';
import { EvaluationPlayer } from '../../src/core/evalplayer/EvaluationPlayer';
import { SimulationPlayer } from '../../src/core/simplayer/SimulationPlayer';
import {
  createServer,
  type SimulationServer,
  type SimulationSystemUploadHandler,
} from '../../src/server';

type JsonRecord = Record<string, unknown>;

interface HarnessEnvironment {
  readonly simulation: {
    readonly components: ComponentManager;
    readonly entities: EntityManager;
    readonly registry: Map<string, ComponentType<unknown>>;
  };
  readonly evaluation: {
    readonly components: ComponentManager;
    readonly entities: EntityManager;
    readonly registry: Map<string, ComponentType<unknown>>;
  };
}

interface Harness extends HarnessEnvironment {
  readonly server: SimulationServer;
}

interface UploadPayload extends JsonRecord {
  readonly entityId?: string;
  readonly components?: JsonRecord;
  readonly priority?: number;
  readonly systemSource?: string;
}

interface SseConnection {
  readonly close: () => void;
  readonly next: () => Promise<string>;
}

interface CompiledSystemFactory {
  (context: {
    System: typeof System;
    ComponentType: typeof ComponentType;
    simulation: {
      components: ComponentManager;
      entities: EntityManager;
      ensureEntity(id: string): void;
      ensureComponentType(name: string): ComponentType<unknown>;
    };
  }): System;
}

function ensureEntity(entities: EntityManager, id: string): void {
  if (!entities.has(id)) {
    entities.create(id);
  }
}

function ensureComponentType<TComponent>(
  manager: ComponentManager,
  registry: Map<string, ComponentType<unknown>>,
  name: string,
): ComponentType<TComponent> {
  const existing = registry.get(name) as ComponentType<TComponent> | undefined;
  if (existing) {
    if (!manager.isRegistered(existing)) {
      manager.register(existing);
    }
    return existing;
  }

  const type = new ComponentType<TComponent>(name);
  manager.register(type);
  registry.set(name, type as ComponentType<unknown>);
  return type;
}

function compileSystemFactory(source: string): CompiledSystemFactory {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new Error('System source is empty.');
  }

  const module = { exports: {} as unknown };
  const sandboxRequire = (specifier: string): unknown => {
    if (specifier === 'src/core/systems/System' || specifier === './core/systems/System') {
      return { System };
    }

    if (specifier === 'src/core/components/ComponentType' || specifier === './core/components/ComponentType') {
      return { ComponentType };
    }

    throw new Error(`Unsupported import: ${specifier}`);
  };

  const evaluator = new Function('require', 'module', 'exports', trimmed);
  evaluator(sandboxRequire, module, module.exports);

  const exported = module.exports as unknown;

  if (typeof exported === 'function') {
    return exported as CompiledSystemFactory;
  }

  if (
    exported &&
    typeof exported === 'object' &&
    typeof (exported as { default?: unknown }).default === 'function'
  ) {
    return (exported as { default: CompiledSystemFactory }).default;
  }

  if (
    exported &&
    typeof exported === 'object' &&
    typeof (exported as { createSystem?: unknown }).createSystem === 'function'
  ) {
    return (exported as { createSystem: CompiledSystemFactory }).createSystem;
  }

  throw new Error('System source must export a factory function.');
}

function createUploadHandler(environment: HarnessEnvironment): SimulationSystemUploadHandler {
  return async (request) => {
    const payload = request.json as UploadPayload | undefined;

    if (!payload || Array.isArray(payload)) {
      throw new Error('System upload payload must be a JSON object.');
    }

    const entityId = typeof payload.entityId === 'string' && payload.entityId.trim()
      ? payload.entityId.trim()
      : 'integration-runner';

    const components =
      payload.components && typeof payload.components === 'object'
        ? (payload.components as JsonRecord)
        : {};

    ensureEntity(environment.simulation.entities, entityId);
    ensureEntity(environment.evaluation.entities, entityId);

    for (const [name, value] of Object.entries(components)) {
      const simulationType = ensureComponentType(
        environment.simulation.components,
        environment.simulation.registry,
        name,
      );
      environment.simulation.components.setComponent(entityId, simulationType, value);

      const evaluationType = ensureComponentType(
        environment.evaluation.components,
        environment.evaluation.registry,
        name,
      );
      environment.evaluation.components.setComponent(entityId, evaluationType, value);
    }

    const source = typeof payload.systemSource === 'string' ? payload.systemSource : '';
    const factory = compileSystemFactory(source);

    const system = factory({
      System,
      ComponentType,
      simulation: {
        components: environment.simulation.components,
        entities: environment.simulation.entities,
        ensureEntity: (id: string) => ensureEntity(environment.simulation.entities, id),
        ensureComponentType: (name: string) =>
          ensureComponentType(environment.simulation.components, environment.simulation.registry, name),
      },
    });

    if (!(system instanceof System)) {
      throw new Error('Uploaded system did not produce a System instance.');
    }

    return {
      system,
      priority: typeof payload.priority === 'number' ? payload.priority : undefined,
    };
  };
}

function createHarness(): Harness {
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

  const environment: HarnessEnvironment = {
    simulation: {
      components: simulationComponents,
      entities: simulationEntities,
      registry: new Map(),
    },
    evaluation: {
      components: evaluationComponents,
      entities: evaluationEntities,
      registry: new Map(),
    },
  };

  const uploadHandler = createUploadHandler(environment);

  const server = createServer({
    simulation: {
      player: new SimulationPlayer(
        simulationEntities,
        simulationComponents,
        simulationSystems,
        simulationInbound,
        simulationOutbound,
        { tickIntervalMs: 5 },
      ),
      inbound: simulationInbound,
      outbound: simulationOutbound,
    },
    evaluation: {
      player: new EvaluationPlayer(
        evaluationEntities,
        evaluationComponents,
        evaluationSystems,
        evaluationInbound,
        evaluationOutbound,
        { tickIntervalMs: 5 },
      ),
      inbound: evaluationInbound,
      outbound: evaluationOutbound,
    },
    systemUpload: uploadHandler,
  });

  return {
    ...environment,
    server,
  };
}

function requestJson(
  port: number,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; payload: unknown }> {
  const payload = body ? JSON.stringify(body) : undefined;

  return new Promise<{ status: number; payload: unknown }>((resolve, reject) => {
    const request = http.request(
      {
        method,
        port,
        path,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : undefined,
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const text = buffer.toString('utf8') || 'null';

          try {
            resolve({
              status: response.statusCode ?? 0,
              payload: JSON.parse(text),
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.on('error', reject);

    if (payload) {
      request.write(payload);
    }

    request.end();
  });
}

function connectSse(port: number, path: string): Promise<SseConnection> {
  return new Promise((resolve, reject) => {
    const request = http.request({
      method: 'GET',
      port,
      path,
      headers: { Accept: 'text/event-stream' },
    });

    request.on('response', (response) => {
      response.setEncoding('utf8');

      let resolver: ((value: string) => void) | null = null;
      const buffer: string[] = [];

      const flush = (chunk: string) => {
        const segments = chunk.split('\n\n');
        for (const segment of segments) {
          const trimmed = segment.trim();
          if (!trimmed.startsWith('data:')) {
            continue;
          }

          const data = trimmed.slice('data:'.length).trim();
          if (resolver) {
            resolver(data);
            resolver = null;
          } else {
            buffer.push(data);
          }
        }
      };

      response.on('data', (chunk: string) => flush(chunk));

      resolve({
        close: () => {
          request.destroy();
        },
        next: () =>
          new Promise<string>((nextResolve) => {
            const existing = buffer.shift();
            if (existing) {
              nextResolve(existing);
              return;
            }

            resolver = nextResolve;
          }),
      });
    });

    request.on('error', reject);
    request.end();
  });
}

async function waitForFrame(
  connection: SseConnection,
  predicate: (frame: Frame) => boolean,
  attempts = 20,
): Promise<Frame> {
  for (let i = 0; i < attempts; i += 1) {
    const raw = await connection.next();
    const frame = JSON.parse(raw) as Frame;
    if (predicate(frame)) {
      return frame;
    }
  }

  throw new Error('Timed out waiting for a matching frame.');
}

function extractCounter(frame: Frame, entityId: string): number | null {
  if (!frame || typeof frame !== 'object' || typeof frame.payload !== 'object') {
    return null;
  }

  const payload = frame.payload as JsonRecord;
  const entities = payload.entities;
  if (!Array.isArray(entities)) {
    return null;
  }

  for (const entity of entities) {
    if (!entity || typeof entity !== 'object') {
      continue;
    }

    if ((entity as JsonRecord).id !== entityId) {
      continue;
    }

    const components = (entity as JsonRecord).components as JsonRecord | undefined;
    const counter = components?.counter as JsonRecord | undefined;
    const value = counter?.value;
    if (typeof value === 'number') {
      return value;
    }
  }

  return null;
}

async function run(): Promise<void> {
  console.log('Creating simulation harness...');
  const harness = createHarness();

  const port = await harness.server.listen(0);
  console.log(`Simulation server listening on port ${port}`);

  const simulationStream = await connectSse(port, '/simulation/stream');
  console.log('Connected to simulation event stream.');

  const evaluationStream = await connectSse(port, '/evaluation/stream');
  console.log('Connected to evaluation event stream.');

  const systemSource = `
module.exports = ({ System, simulation }) => {
  const counterType = simulation.ensureComponentType('counter');
  simulation.ensureEntity('runner-1');

  return new (class IncrementCounterSystem extends System {
    update() {
      const current = simulation.components.getComponent('runner-1', counterType) || { value: 0 };
      simulation.components.setComponent('runner-1', counterType, { value: current.value + 1 });
    }
  })();
};
`;

  console.log('Uploading system source code...');
  const upload = await requestJson(port, 'POST', '/simulation/systems', {
    entityId: 'runner-1',
    components: {
      counter: { value: 0 },
      label: { text: 'integration-script' },
    },
    systemSource,
  });

  console.log('Upload response:', upload);
  if (upload.status !== 201) {
    throw new Error(`Unexpected upload status: ${upload.status}`);
  }

  console.log('Starting simulation playback...');
  const start = await requestJson(port, 'POST', '/simulation/playback', {
    command: 'start',
  });

  console.log('Playback response:', start);
  if (start.status !== 200) {
    throw new Error(`Unexpected playback status: ${start.status}`);
  }

  console.log('Waiting for simulation frame...');
  const simulationFrame = await waitForFrame(
    simulationStream,
    (frame) => frame.type === 'simulation/frame' && (extractCounter(frame, 'runner-1') ?? 0) >= 1,
  );
  console.log('Simulation frame received:', JSON.stringify(simulationFrame, null, 2));

  console.log('Waiting for evaluation frame...');
  const evaluationFrame = await waitForFrame(
    evaluationStream,
    (frame) => frame.type === 'evaluation/frame' && (extractCounter(frame, 'runner-1') ?? 0) >= 1,
  );
  console.log('Evaluation frame received:', JSON.stringify(evaluationFrame, null, 2));

  simulationStream.close();
  evaluationStream.close();
  await harness.server.close();
  console.log('Simulation harness shut down successfully.');
}

if (require.main === module) {
  run().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Integration run failed:', error);
    process.exitCode = 1;
  });
}

export { run };
