import http from 'http';
import type { EvaluationPlayer } from './core/evalplayer/EvaluationPlayer';
import type { IOPlayer } from './core/IOPlayer';
import type { System } from './core/systems/System';
import type { ComponentType } from './core/components/ComponentType';
import { Router } from './routes/router';
import {
  registerSimulationRoutes,
  type SimulationSystemDescriptor,
  type SimulationComponentDescriptor,
} from './routes/simulation';
import {
  registerEvaluationRoutes,
  type EvaluationSystemDescriptor,
  type EvaluationComponentDescriptor,
} from './routes/evaluation';
import { registerCodebaseRoutes } from './routes/codebase';
import {
  registerInformationRoutes,
  type InformationDocument,
  type InformationSegment,
} from './routes/information';
import { registerSystemRoutes } from './routes/system';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');
const SERVER_VERSION: string = typeof packageJson?.version === 'string' ? packageJson.version : '0.0.0';

export interface ServerOptions {
  port: number;
  router: Router;
  host?: string;
}

export class Server {
  private readonly port: number;
  private readonly router: Router;
  private readonly host: string | undefined;
  private httpServer: http.Server | null = null;

  constructor(options: ServerOptions) {
    this.port = options.port;
    this.router = options.router;
    this.host = options.host;
  }

  async start(): Promise<void> {
    if (this.httpServer) {
      return;
    }

    this.httpServer = http.createServer((req, res) => {
      const handled = this.router.dispatch(req, res);
      if (!handled) {
        if (typeof res.writeHead === 'function') {
          res.writeHead(404);
        }
        if (typeof res.end === 'function') {
          res.end();
        }
      }
    });

    await new Promise<void>((resolve) => {
      this.httpServer?.listen(this.port, this.host, resolve);
    });
  }

  async stop(): Promise<void> {
    if (!this.httpServer) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.httpServer?.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    this.httpServer = null;
  }
}

export interface BootstrapOptions {
  port: number;
  host?: string;
  simulation: {
    player: IOPlayer & {
      injectSystem: (payload: { system: System }) => string;
      ejectSystem: (payload: { system?: System; systemId?: string }) => boolean;
      registerComponent: (component: ComponentType<unknown>) => void;
      removeComponent: (componentId: string) => boolean;
    };
    outboundBus: unknown;
    loadSystem: (descriptor: SimulationSystemDescriptor) => Promise<System>;
    loadComponent: (descriptor: SimulationComponentDescriptor) => Promise<ComponentType<unknown>>;
  };
  evaluation: {
    player: EvaluationPlayer;
    outboundBus: unknown;
    loadSystem: (descriptor: EvaluationSystemDescriptor) => Promise<System>;
    loadComponent: (descriptor: EvaluationComponentDescriptor) => Promise<ComponentType<unknown>>;
  };
  codebase: {
    rootDir: string;
    listDir: (root: string, relative: string) => Promise<string[]>;
    readFile: (root: string, relative: string) => Promise<string>;
    writeFile: (root: string, relative: string, content: string, options?: { overwrite?: boolean }) => Promise<void>;
  };
  information: {
    segments: InformationSegment[];
    documents: InformationDocument[];
    readDocument: (filename: string) => Promise<string>;
  };
  authToken?: string;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

export function createServer(options: BootstrapOptions): Server {
  const router = new Router({ basePath: '/api', authToken: options.authToken, rateLimit: options.rateLimit });
  const bootTime = Date.now();

  registerSimulationRoutes(router, {
    player: options.simulation.player,
    outboundBus: options.simulation.outboundBus as any,
    loadSystem: options.simulation.loadSystem,
    loadComponent: options.simulation.loadComponent,
  });

  registerEvaluationRoutes(router, {
    player: options.evaluation.player,
    outboundBus: options.evaluation.outboundBus as any,
    loadSystem: options.evaluation.loadSystem,
    loadComponent: options.evaluation.loadComponent,
  });

  registerCodebaseRoutes(router, {
    rootDir: options.codebase.rootDir,
    listDir: options.codebase.listDir,
    readFile: options.codebase.readFile,
    writeFile: options.codebase.writeFile,
  });

  registerInformationRoutes(router, {
    segments: options.information.segments,
    documents: options.information.documents,
    readDocument: options.information.readDocument,
  });

  registerSystemRoutes(router, {
    getUptimeMs: () => Date.now() - bootTime,
    version: SERVER_VERSION,
    simulation: options.simulation.player,
    evaluation: options.evaluation.player,
  });

  return new Server({ port: options.port, host: options.host, router });
}
