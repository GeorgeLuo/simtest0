import type { EvaluationPlayer } from '../core/evalplayer/EvaluationPlayer';
import type { IOPlayer } from '../core/simplayer/IOPlayer';
import { registerSimulationRoutes } from '../routes/simulation';
import type { SimulationSystemDescriptor } from '../routes/simulation';
import { registerEvaluationRoutes } from '../routes/evaluation';
import { registerCodebaseRoutes } from '../routes/codebase';
import { registerInformationRoutes } from '../routes/information';
import type { InformationDocument, InformationSegment } from '../routes/information';
import { Router } from '../routes/router';
import { Server } from './index';
import type { System } from '../core/systems/System';

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
