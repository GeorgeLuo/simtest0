import http from 'http';
import type { EvaluationPlayer } from './core/evalplayer/EvaluationPlayer';
import type { IOPlayer } from './core/IOPlayer';
import type { System } from './core/systems/System';
import type { ComponentType } from './core/components/ComponentType';
import { Router } from './routes/router';
import { registerSimulationRoutes, type SimulationSystemDescriptor } from './routes/simulation';
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
    player: IOPlayer;
    outboundBus: unknown;
    loadSystem: (descriptor: SimulationSystemDescriptor) => Promise<System>;
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
  };
  information: {
    segments: InformationSegment[];
    documents: InformationDocument[];
    readDocument: (filename: string) => Promise<string>;
  };
}

export function createServer(options: BootstrapOptions): Server {
  const router = new Router({ basePath: '/api' });

  registerSimulationRoutes(router, {
    player: options.simulation.player,
    outboundBus: options.simulation.outboundBus as any,
    loadSystem: options.simulation.loadSystem,
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
  });

  registerInformationRoutes(router, {
    segments: options.information.segments,
    documents: options.information.documents,
    readDocument: options.information.readDocument,
  });

  return new Server({ port: options.port, host: options.host, router });
}
