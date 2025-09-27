import http, { type Server } from 'http';
import type { Bus } from './core/messaging/Bus';
import type { SimulationPlayer } from './core/simplayer/SimulationPlayer';
import type { EvaluationPlayer } from './core/evalplayer/EvaluationPlayer';
import { Router, sendJson } from './routes/router';
import {
  registerSimulationRoutes,
  type SimulationPlaybackState,
  type SimulationRouteContext,
  type SimulationSystemUploadHandler,
  type SimulationSystemUploadRequest,
  type SimulationSystemUploadResult,
} from './routes/simulation';
import { registerEvaluationRoutes } from './routes/evaluation';

interface SimulationConfig {
  readonly player: Pick<
    SimulationPlayer,
    'start' | 'resume' | 'pause' | 'stop' | 'commands'
  >;
  readonly inbound: Bus;
  readonly outbound: Bus;
}

interface EvaluationConfig {
  readonly player: Pick<EvaluationPlayer, 'start' | 'stop'>;
  readonly inbound: Bus;
  readonly outbound: Bus;
}

export interface ServerConfig {
  readonly simulation: SimulationConfig;
  readonly evaluation: EvaluationConfig;
  readonly systemUpload?: SimulationSystemUploadHandler;
}

class PlaybackStateTracker {
  private state: SimulationPlaybackState;

  constructor(initial: SimulationPlaybackState = 'idle') {
    this.state = initial;
  }

  set(state: SimulationPlaybackState): void {
    this.state = state;
  }

  get(): SimulationPlaybackState {
    return this.state;
  }
}

export interface SimulationServer {
  readonly node: Server;
  listen(port?: number): Promise<number>;
  close(): Promise<void>;
  getStates(): { simulation: SimulationPlaybackState; evaluation: SimulationPlaybackState };
}

export function createServer(config: ServerConfig): SimulationServer {
  const router = new Router();
  const simulationState = new PlaybackStateTracker();
  const evaluationState = new PlaybackStateTracker();

  const simulationContext: SimulationRouteContext = {
    commandBus: config.simulation.inbound,
    outboundBus: config.simulation.outbound,
    commands: config.simulation.player.commands,
    onStateChange: (state) => simulationState.set(state),
    systemUpload: config.systemUpload,
  };

  registerSimulationRoutes(router, simulationContext);
  registerEvaluationRoutes(router, { outboundBus: config.evaluation.outbound });

  router.add('GET', '/info', (req, res) => {
    sendJson(res, 200, {
      simulation: { state: simulationState.get() },
      evaluation: { state: evaluationState.get() },
    });
  });

  const server = http.createServer((req, res) => router.handle(req, res));
  let started = false;
  const forwardUnsubscribe = config.simulation.outbound.subscribe((frame) => {
    config.evaluation.inbound.send(frame);
  });

  return {
    node: server,
    async listen(port = 0) {
      if (started) {
        throw new Error('Server already started.');
      }

      await new Promise<void>((resolve, reject) => {
        const handleError = (error: Error) => {
          server.off('listening', handleListening);
          reject(error);
        };

        const handleListening = () => {
          server.off('error', handleError);
          resolve();
        };

        server.once('error', handleError);
        server.once('listening', handleListening);
        server.listen(port);
      });

      started = true;
      config.simulation.player.start();
      simulationState.set('running');
      config.evaluation.player.start();
      evaluationState.set('running');

      const address = server.address();
      if (address && typeof address === 'object') {
        return address.port;
      }

      return port;
    },
    async close() {
      if (!started) {
        forwardUnsubscribe();
        return;
      }

      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      config.simulation.player.stop();
      simulationState.set('idle');
      config.evaluation.player.stop();
      evaluationState.set('idle');
      forwardUnsubscribe();
      started = false;
    },
    getStates() {
      return {
        simulation: simulationState.get(),
        evaluation: evaluationState.get(),
      };
    },
  };
}

export type {
  SimulationPlaybackState,
  SimulationSystemUploadHandler,
  SimulationSystemUploadRequest,
  SimulationSystemUploadResult,
};
