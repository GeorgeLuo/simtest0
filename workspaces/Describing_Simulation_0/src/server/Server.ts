import { createServer as createHttpServer, Server as HttpServer } from "node:http";
import { EvaluationPlayer } from "../core/evalplayer/EvaluationPlayer.js";
import { SimulationPlayer } from "../core/simplayer/SimulationPlayer.js";
import { Router } from "../routes/router.js";

export interface ServerConfig {
  readonly port: number;
  readonly host?: string;
}

export interface ServerDependencies {
  readonly simulationPlayer: SimulationPlayer;
  readonly evaluationPlayer: EvaluationPlayer;
  readonly router: Router;
  readonly cleanup?: () => void;
}

export class Server {
  private readonly simulationPlayer: SimulationPlayer;
  private readonly evaluationPlayer: EvaluationPlayer;
  private readonly router: Router;
  private readonly cleanup?: () => void;
  private httpServer: HttpServer | null = null;
  private listening = false;

  constructor(
    private readonly config: ServerConfig,
    dependencies: ServerDependencies,
  ) {
    this.simulationPlayer = dependencies.simulationPlayer;
    this.evaluationPlayer = dependencies.evaluationPlayer;
    this.router = dependencies.router;
    this.cleanup = dependencies.cleanup;
  }

  async start(): Promise<void> {
    if (this.listening) {
      return;
    }

    const listener = this.router.createListener() as Parameters<typeof createHttpServer>[0];
    this.httpServer = createHttpServer(listener);

    await new Promise<void>((resolve, reject) => {
      const server = this.httpServer!;

      const handleError = (error: Error) => {
        this.httpServer = null;
        reject(error);
      };

      const detachError = () => {
        const candidate = server as unknown as {
          off?: (event: string, handler: (error: Error) => void) => void;
          removeListener?: (event: string, handler: (error: Error) => void) => void;
        };
        if (typeof candidate.off === "function") {
          candidate.off("error", handleError);
        } else if (typeof candidate.removeListener === "function") {
          candidate.removeListener("error", handleError);
        }
      };

      const attachError = () => {
        const candidate = server as unknown as {
          once?: (event: string, handler: (error: Error) => void) => void;
          on?: (event: string, handler: (error: Error) => void) => void;
        };
        if (typeof candidate.once === "function") {
          candidate.once("error", handleError);
        } else if (typeof candidate.on === "function") {
          candidate.on("error", handleError);
        }
      };

      attachError();

      const onListening = () => {
        detachError();
        this.listening = true;
        resolve();
      };

      try {
        const host = this.config.host ?? "0.0.0.0";
        server.listen(this.config.port, host, onListening);
      } catch (error) {
        detachError();
        handleError(error as Error);
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.listening || !this.httpServer) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.httpServer?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    this.listening = false;
    this.httpServer = null;

    this.simulationPlayer.dispose();
    this.evaluationPlayer.dispose();
    this.cleanup?.();
  }

  getConfig(): ServerConfig {
    return this.config;
  }

  getRouter(): Router {
    return this.router;
  }

  getSimulationPlayer(): SimulationPlayer {
    return this.simulationPlayer;
  }

  getEvaluationPlayer(): EvaluationPlayer {
    return this.evaluationPlayer;
  }
}
