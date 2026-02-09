import path from 'path';
import { promises as fs } from 'fs';
import type { Dirent } from 'fs';
import { createServer, Server } from './server';
import type { SimulationSystemDescriptor, SimulationComponentDescriptor } from './routes/simulation';
import type { EvaluationComponentDescriptor, EvaluationSystemDescriptor } from './routes/evaluation';
import {
  SimulationPlayer,
  EvaluationPlayer,
  EvaluationMessageType,
  EntityManager,
  ComponentManager,
  SystemManager,
  Bus,
  FrameFilter,
  System,
} from '@georgeluo/ecs';
import type { IOPlayer, ComponentType, Frame, Acknowledgement, SystemContext } from '@georgeluo/ecs';

const DEFAULT_PORT = 3000;

export interface StartOptions {
  port?: number;
  host?: string;
  rootDir?: string;
  instructionDir?: string;
  log?: (message: string) => void;
  cycleIntervalMs?: number;
  authToken?: string | null;
  rateLimit?: RateLimitOptions | null;
  autoStartEvaluation?: boolean;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export async function start(options: StartOptions = {}): Promise<Server> {
  const log = options.log ?? console.log;
  const port = resolvePort(options.port);
  const host = options.host ?? process.env.SIMEVAL_HOST ?? process.env.HOST;
  const rootDir = options.rootDir ?? path.resolve(__dirname, '..');
  const instructionDir =
    options.instructionDir ?? (await resolveInstructionDir(rootDir));
  const cycleIntervalMs = options.cycleIntervalMs;
  const authToken = resolveAuthToken(options.authToken);
  const rateLimit = resolveRateLimit(options.rateLimit);
  const autoStartEvaluation = options.autoStartEvaluation ?? resolveAutoStartEvaluation();

  const informationSegments = [
    {
      id: 'simulation',
      title: 'Simulation',
      description: 'Control playback, inject systems, and stream frames.',
      path: '/simulation',
    },
    {
      id: 'evaluation',
      title: 'Evaluation',
      description: 'Inject evaluation systems/components, ingest frames, and receive evaluation output.',
      path: '/evaluation',
    },
    {
      id: 'codebase',
      title: 'Codebase',
      description: 'Browse project files to support plugin composition.',
      path: '/codebase',
    },
  ];

  const informationDocuments = [
    {
      id: 'api.md',
      title: 'SimEval API Map',
      description: 'Full HTTP surface as defined in Describing_Simulation_0_simeval_api_map.md.',
      filename: path.join(instructionDir, 'Describing_Simulation_0_simeval_api_map.md'),
    },
    {
      id: 'Describing_Simulation.md',
      title: 'Describing Simulation — Source Manuscript',
      description: 'Complete specification copied verbatim from Describing_Simulation_0.md.',
      filename: path.join(instructionDir, 'Describing_Simulation_0.md'),
    },
  ];

  const loadSystem = async (
    descriptor: SimulationSystemDescriptor | EvaluationSystemDescriptor,
  ): Promise<System> => {
    const resolved = await resolvePath(rootDir, descriptor.modulePath);
    purgeRequireCache(resolved);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleExports = require(resolved);

    const candidate = selectExport(moduleExports, descriptor.exportName ?? null);
    return buildValidatedSystem(candidate, descriptor.modulePath);
  };

  const loadComponent = async (
    descriptor: EvaluationComponentDescriptor | SimulationComponentDescriptor,
  ): Promise<ComponentType<unknown>> => {
    const resolved = await resolvePath(rootDir, descriptor.modulePath);
    purgeRequireCache(resolved);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleExports = require(resolved);

    const candidate = selectExport(moduleExports, descriptor.exportName ?? null);
    return resolveComponentType(candidate, descriptor.modulePath);
  };

  const simulation = createSimulationPlayer(cycleIntervalMs);
  const evaluation = createEvaluationPlayer(cycleIntervalMs);

  let frameSequence = 0;
  simulation.outboundBus.subscribe((message) => {
    if (isFrame(message)) {
      frameSequence += 1;
      evaluation.inboundBus.publish({
        type: EvaluationMessageType.INJECT_FRAME,
        payload: {
          messageId: `frame-${frameSequence}`,
          frame: message,
        },
      });
    }
  });

  const server = createServer({
    port,
    host,
    simulation: {
      player: simulation.player,
      outboundBus: simulation.outboundBus,
      loadSystem,
      loadComponent,
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
      writeFile: writeFileToRoot,
    },
    information: {
      segments: informationSegments,
      documents: informationDocuments,
      readDocument: (filename: string) => fs.readFile(filename, 'utf8'),
    },
    authToken,
    rateLimit,
  });

  const originalStop = typeof server.stop === 'function' ? server.stop.bind(server) : null;
  if (originalStop) {
    server.stop = async () => {
      simulation.player.stop();
      evaluation.player.stop();
      await originalStop();
    };
  }

  await server.start();
  if (autoStartEvaluation) {
    evaluation.player.start();
  }
  log(`SimEval server listening on http://${host ?? 'localhost'}:${port}`);
  return server;
}

function purgeRequireCache(resolvedPath: string): void {
  try {
    const cacheKey = require.resolve(resolvedPath);
    if (require.cache[cacheKey]) {
      delete require.cache[cacheKey];
    }
  } catch {
    // ignore cache purge errors; module may not be resolvable yet
  }
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

function resolveAuthToken(candidate?: string | null): string | undefined {
  const token = (candidate ?? process.env.SIMEVAL_AUTH_TOKEN ?? '').trim();
  return token.length > 0 ? token : undefined;
}

function resolveRateLimit(candidate?: RateLimitOptions | null): RateLimitOptions | undefined {
  if (candidate && isValidRateLimit(candidate)) {
    return candidate;
  }

  const windowEnv = process.env.SIMEVAL_RATE_WINDOW_MS;
  const maxEnv = process.env.SIMEVAL_RATE_MAX;
  if (!windowEnv && !maxEnv) {
    return undefined;
  }

  const windowMs = windowEnv ? Number.parseInt(windowEnv, 10) : 60000;
  const max = maxEnv ? Number.parseInt(maxEnv, 10) : 120;
  if (!Number.isFinite(windowMs) || windowMs <= 0 || !Number.isFinite(max) || max <= 0) {
    return undefined;
  }

  return { windowMs, max };
}

function resolveAutoStartEvaluation(): boolean {
  const env = process.env.SIMEVAL_AUTO_START_EVALUATION;
  if (typeof env === 'string') {
    const lowered = env.toLowerCase().trim();
    if (['1', 'true', 'yes', 'on'].includes(lowered)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(lowered)) {
      return false;
    }
  }

  return false;
}

function isValidRateLimit(value: RateLimitOptions): boolean {
  return Number.isFinite(value.windowMs) && value.windowMs > 0 && Number.isFinite(value.max) && value.max > 0;
}

async function resolveInstructionDir(rootDir: string): Promise<string> {
  const candidates = [
    path.join(rootDir, 'instruction_documents'),
    path.join(rootDir, '..', 'instruction_documents'),
    path.join(rootDir, '..', '..', 'instruction_documents'),
  ];

  for (const candidate of candidates) {
    if (await directoryExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to locate instruction_documents directory. Checked: ${candidates.join(', ')}`);
}

async function directoryExists(candidate: string): Promise<boolean> {
  try {
    const stats = await fs.stat(candidate);
    return stats.isDirectory();
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
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
  const frameFilter = new FrameFilter(['evaluation.frame']);
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

async function writeFileToRoot(
  rootDir: string,
  relativePath: string,
  content: string,
  options?: { overwrite?: boolean },
): Promise<void> {
  const target = await resolvePath(rootDir, relativePath);
  const directory = path.dirname(target);
  const relativeDirectory = path.relative(rootDir, directory).replace(/\\/g, '/') || '.';

  try {
    const stats = await fs.stat(directory);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${relativeDirectory}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      throw new Error(`Directory does not exist: ${relativeDirectory}`);
    }
    throw error;
  }

  if (!options?.overwrite) {
    try {
      await fs.stat(target);
      throw new Error(`File already exists: ${relativePath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  await fs.writeFile(target, content, 'utf8');
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

async function buildValidatedSystem(candidate: unknown, modulePath: string): Promise<System> {
  const createInstance = async () => wrapSystem(await instantiateSystem(candidate), modulePath);

  try {
    const validationInstance = await createInstance();
    validateSystemInstance(validationInstance, modulePath);
    return await createInstance();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`System validation failed for ${modulePath}: ${detail}`);
  }
}

function validateSystemInstance(system: System, modulePath: string): void {
  const context = createValidationContext();
  try {
    system.initialize(context);
    system.update(context);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`System validation failed for ${modulePath}: ${detail}`);
  }
}

function createValidationContext(): SystemContext {
  const entityManager = new EntityManager();
  const componentManager = new ComponentManager();
  return { entityManager, componentManager };
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
