import path from 'path';
import { promises as fs } from 'fs';
import type { Dirent } from 'fs';
import { createServer, Server } from './server';
import type { IOPlayer } from './core/IOPlayer';
import { SimulationPlayer } from './core/simplayer/SimulationPlayer';
import { EvaluationPlayer } from './core/evalplayer/EvaluationPlayer';
import { EntityManager } from './core/entity/EntityManager';
import { ComponentManager } from './core/components/ComponentManager';
import type { ComponentType } from './core/components/ComponentType';
import { SystemManager } from './core/systems/SystemManager';
import { Bus } from './core/messaging/Bus';
import { FrameFilter } from './core/messaging/outbound/FrameFilter';
import type { Frame } from './core/messaging/outbound/Frame';
import type { Acknowledgement } from './core/messaging/outbound/Acknowledgement';
import type { SimulationSystemDescriptor } from './routes/simulation';
import type { EvaluationComponentDescriptor, EvaluationSystemDescriptor } from './routes/evaluation';
import { System, type SystemContext } from './core/systems/System';

const DEFAULT_PORT = 3000;

export interface StartOptions {
  port?: number;
  host?: string;
  rootDir?: string;
  log?: (message: string) => void;
  cycleIntervalMs?: number;
}

export async function start(options: StartOptions = {}): Promise<Server> {
  const log = options.log ?? console.log;
  const port = resolvePort(options.port);
  const host = options.host ?? process.env.SIMEVAL_HOST ?? process.env.HOST;
  const rootDir = options.rootDir ?? path.resolve(__dirname, '..');
  const informationDir = path.join(rootDir, 'src', 'routes', 'information');
  const cycleIntervalMs = options.cycleIntervalMs;

  const informationSegments = [
    {
      id: 'simulation',
      title: 'Simulation',
      description: 'Control playback, inject systems, and stream frames.',
      path: '/api/simulation',
    },
    {
      id: 'evaluation',
      title: 'Evaluation',
      description: 'Inject evaluation systems/components, ingest frames, and receive evaluation output.',
      path: '/api/evaluation',
    },
    {
      id: 'codebase',
      title: 'Codebase',
      description: 'Browse project files to support plugin composition.',
      path: '/api/codebase',
    },
  ];

  const informationDocuments = [
    {
      id: 'api',
      title: 'SimEval API Overview',
      description: 'Endpoint summary for simulation, evaluation, and codebase routes.',
      filename: path.join(informationDir, 'api.md'),
    },
    {
      id: 'describing-simulation',
      title: 'Describing Simulation Orientation',
      description: 'High-level ECS concepts and extension workflow.',
      filename: path.join(informationDir, 'Describing_Simulation.md'),
    },
  ];

  const loadSystem = async (
    descriptor: SimulationSystemDescriptor | EvaluationSystemDescriptor,
  ): Promise<System> => {
    const resolved = await resolvePath(rootDir, descriptor.modulePath);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleExports = require(resolved);

    const candidate = selectExport(moduleExports, descriptor.exportName ?? null);
    const systemLike = await instantiateSystem(candidate);
    return wrapSystem(systemLike, descriptor.modulePath);
  };

  const loadComponent = async (
    descriptor: EvaluationComponentDescriptor,
  ): Promise<ComponentType<unknown>> => {
    const resolved = await resolvePath(rootDir, descriptor.modulePath);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleExports = require(resolved);

    const candidate = selectExport(moduleExports, descriptor.exportName ?? null);
    return resolveComponentType(candidate, descriptor.modulePath);
  };

  const simulation = createSimulationPlayer(cycleIntervalMs);
  const evaluation = createEvaluationPlayer(cycleIntervalMs);

  simulation.outboundBus.subscribe((message) => {
    if (isFrame(message)) {
      evaluation.player.injectFrame({ frame: message });
    }
  });

  const server = createServer({
    port,
    host,
    simulation: {
      player: simulation.player,
      outboundBus: simulation.outboundBus,
      loadSystem,
    },
    evaluation: {
      player: evaluation.player,
      outboundBus: evaluation.outboundBus,
      loadSystem,
      loadComponent,
    },
    codebase: {
      rootDir,
      listDir: listDirectory,
      readFile: readFileFromRoot,
    },
    information: {
      segments: informationSegments,
      documents: informationDocuments,
      readDocument: (filename: string) => fs.readFile(filename, 'utf8'),
    },
  });

  await server.start();
  log(`SimEval server listening on http://${host ?? 'localhost'}:${port}`);
  return server;
}

function resolvePort(explicit?: number): number {
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }

  const envPort = process.env.SIMEVAL_PORT ?? process.env.PORT;
  if (envPort) {
    const parsed = Number.parseInt(envPort, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return DEFAULT_PORT;
}

interface PlayerBundle<TPlayer extends IOPlayer> {
  player: TPlayer;
  inboundBus: Bus<unknown>;
  outboundBus: Bus<Frame | Acknowledgement>;
}

function createSimulationPlayer(cycleIntervalMs?: number): PlayerBundle<SimulationPlayer> {
  const entityManager = new EntityManager();
  const componentManager = new ComponentManager();
  const systemManager = new SystemManager(entityManager, componentManager);
  const inboundBus = new Bus<unknown>();
  const outboundBus = new Bus<Frame | Acknowledgement>();
  const frameFilter = new FrameFilter();
  const player =
    cycleIntervalMs === undefined
      ? new SimulationPlayer(systemManager, inboundBus, outboundBus, frameFilter)
      : new SimulationPlayer(systemManager, inboundBus, outboundBus, frameFilter, undefined, cycleIntervalMs);
  return { player, inboundBus, outboundBus };
}

function createEvaluationPlayer(cycleIntervalMs?: number): PlayerBundle<EvaluationPlayer> {
  const entityManager = new EntityManager();
  const componentManager = new ComponentManager();
  const systemManager = new SystemManager(entityManager, componentManager);
  const inboundBus = new Bus<unknown>();
  const outboundBus = new Bus<Frame | Acknowledgement>();
  const frameFilter = new FrameFilter();
  const player =
    cycleIntervalMs === undefined
      ? new EvaluationPlayer(systemManager, inboundBus, outboundBus, frameFilter)
      : new EvaluationPlayer(systemManager, inboundBus, outboundBus, frameFilter, undefined, cycleIntervalMs);
  return { player, inboundBus, outboundBus };
}

async function listDirectory(rootDir: string, relativePath: string): Promise<string[]> {
  const target = await resolvePath(rootDir, relativePath || '.');
  const stats = await fs.stat(target);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${relativePath}`);
  }

  const entries: Dirent[] = await fs.readdir(target, { withFileTypes: true });
  return entries
    .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function readFileFromRoot(rootDir: string, relativePath: string): Promise<string> {
  const target = await resolvePath(rootDir, relativePath);
  const stats = await fs.stat(target);
  if (!stats.isFile()) {
    throw new Error(`Path is not a file: ${relativePath}`);
  }

  return fs.readFile(target, 'utf8');
}

async function resolvePath(rootDir: string, relativePath: string): Promise<string> {
  const sanitizedRelative = relativePath.replace(/^[/\\]+/, '');
  const resolved = path.resolve(rootDir, sanitizedRelative);
  const relative = path.relative(rootDir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Resolved path escapes root: ${relativePath}`);
  }
  return resolved;
}

function isFrame(message: Frame | Acknowledgement): message is Frame {
  return (
    typeof (message as Frame)?.tick === 'number' &&
    typeof (message as Frame)?.entities === 'object' &&
    message !== null
  );
}

interface SystemLike {
  initialize?: (context: SystemContext) => void;
  update: (context: SystemContext) => void;
  destroy?: (context: SystemContext) => void;
}

function selectExport(moduleExports: unknown, exportName: string | null): unknown {
  if (!moduleExports || typeof moduleExports !== 'object') {
    return moduleExports;
  }

  const exportsRecord = moduleExports as Record<string, unknown> & { default?: unknown };

  if (exportName) {
    if (!(exportName in exportsRecord)) {
      throw new Error(`Export "${exportName}" not found in module`);
    }
    return exportsRecord[exportName];
  }

  if (exportsRecord.default !== undefined) {
    return exportsRecord.default;
  }

  if (typeof exportsRecord.createSystem === 'function') {
    return exportsRecord.createSystem;
  }

  return moduleExports;
}

async function instantiateSystem(candidate: unknown): Promise<SystemLike> {
  if (isSystemConstructor(candidate)) {
    return new candidate();
  }

  if (typeof candidate === 'function') {
    const produced = candidate();
    const resolved = isPromise(produced) ? await produced : produced;
    if (isSystemLike(resolved)) {
      return resolved;
    }
  }

  if (isSystemLike(candidate)) {
    return candidate;
  }

  throw new Error('Module export did not produce a System-compatible value');
}

function wrapSystem(systemLike: SystemLike, modulePath: string): System {
  if (systemLike instanceof System) {
    return systemLike;
  }

  const impl = systemLike;
  class WrappedSystem extends System {
    private readonly inner: SystemLike;

    constructor(inner: SystemLike) {
      super();
      this.inner = inner;
    }

    override initialize(context: SystemContext): void {
      this.inner.initialize?.(context);
    }

    override update(context: SystemContext): void {
      this.inner.update(context);
    }

    override destroy(context: SystemContext): void {
      this.inner.destroy?.(context);
    }
  }

  try {
    return new WrappedSystem(impl);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to wrap system from ${modulePath}: ${detail}`);
  }
}

async function resolveComponentType(candidate: unknown, modulePath: string): Promise<ComponentType<unknown>> {
  const materialized = await materializeComponent(candidate);
  return ensureComponentShape(materialized, modulePath);
}

async function materializeComponent(candidate: unknown): Promise<unknown> {
  if (typeof candidate === 'function') {
    const produced = candidate();
    return isPromise(produced) ? await produced : produced;
  }

  return candidate;
}

function ensureComponentShape(candidate: unknown, modulePath: string): ComponentType<unknown> {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(`Module export did not produce a ComponentType from ${modulePath}`);
  }

  const component = candidate as ComponentType<unknown>;
  if (typeof component.id !== 'string' || component.id.length === 0) {
    throw new Error(`Component from ${modulePath} is missing a valid id`);
  }

  if (typeof component.validate !== 'function') {
    throw new Error(`Component from ${modulePath} is missing a validate function`);
  }

  return component;
}

function isSystemConstructor(value: unknown): value is new () => SystemLike {
  if (typeof value !== 'function') {
    return false;
  }

  const prototype = (value as { prototype?: unknown }).prototype as { update?: unknown } | undefined;
  return Boolean(prototype && typeof prototype.update === 'function');
}

function isSystemLike(value: unknown): value is SystemLike {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return typeof (value as SystemLike).update === 'function';
}

function isPromise<T>(value: unknown): value is Promise<T> {
  return Boolean(value && typeof (value as Promise<T>).then === 'function');
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start SimEval server:', error);
    process.exitCode = 1;
  });
}
