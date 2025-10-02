import http from "http";
import { Router } from "./routes/router";
import { registerSimulationRoutes } from "./routes/simulation";
import { registerEvaluationRoutes } from "./routes/evaluation";
import { registerCodebaseRoutes } from "./routes/codebase";
import { Bus } from "./core/messaging/Bus";
import type { CommandMessage, OutboundEvent } from "./core/player/IOPlayer";
import { SimulationPlayer } from "./core/player/simplayer/SimulationPlayer";
import { EvaluationPlayer } from "./core/player/evalplayer/EvaluationPlayer";
import { EntityManager } from "./core/entity/EntityManager";
import { ComponentManager } from "./core/components/ComponentManager";
import { SystemManager } from "./core/systems/management/SystemManager";
import { TimeComponent } from "./core/components/time/TimeComponent";
import { TimeSystem } from "./core/systems/time/TimeSystem";
import type { Frame } from "./core/messaging/outbound/Frame";
import type { Acknowledgement } from "./core/messaging/outbound/Acknowledgement";
import { IntervalLoop } from "./core/player/Loop";
import type { LoopController } from "./core/player/Player";
import { promises as fs } from "fs";
import path from "path";

export interface SimulationServerOptions {
  loopIntervalMs?: number;
}

interface PendingAck {
  resolve: (ack: Acknowledgement) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
}

export interface SimulationServer {
  start(port?: number): Promise<number>;
  stop(): Promise<void>;
  server: http.Server;
  player: SimulationPlayer;
  sendSimulationCommand(command: CommandMessage): Promise<Acknowledgement>;
  getSimulationFrame(): Frame | null;
  sendEvaluationCommand(command: CommandMessage): Promise<Acknowledgement>;
  getEvaluationFrame(): Frame | null;
  listEvaluationSnapshots(): Promise<string[]>;
  saveEvaluationSnapshot(name: string, frame?: Frame): Promise<void>;
  loadEvaluationSnapshot(name: string): Promise<void>;
}

export function createSimulationServer(options?: SimulationServerOptions): SimulationServer {
  const components = new ComponentManager();
  const entities = new EntityManager(components);
  const systems = new SystemManager();
  const timeComponent = new TimeComponent("time");
  const timeSystem = new TimeSystem(entities, components, timeComponent);
  systems.add(timeSystem);

  const simulationInbound = new Bus<CommandMessage>();
  const simulationOutbound = new Bus<OutboundEvent>();

  let simulationLoopHandle: IntervalLoop | null = null;
  const simulationLoopController: LoopController = {
    start: (cb) => {
      simulationLoopHandle?.stop();
      simulationLoopHandle = new IntervalLoop(cb, options?.loopIntervalMs ?? 20);
    },
    stop: () => {
      simulationLoopHandle?.stop();
      simulationLoopHandle = null;
    },
  };

  const simulationPlayer = new SimulationPlayer(
    entities,
    components,
    systems,
    simulationLoopController,
    simulationInbound,
    simulationOutbound,
  );

  const simulationPendingAcks = new Map<string, PendingAck>();
  let latestFrame: Frame | null = null;
  const ackTimeoutMs = 5000;

  const unsubscribeSimulation = simulationOutbound.subscribe((event) => {
    if (event.kind === "ack") {
      const pending = simulationPendingAcks.get(event.ack.id);
      if (pending) {
        clearTimeout(pending.timer);
        simulationPendingAcks.delete(event.ack.id);
        pending.resolve(event.ack);
      }
    }

    if (event.kind === "frame") {
      latestFrame = event.frame;
    }
  });

  async function sendSimulationCommand(command: CommandMessage): Promise<Acknowledgement> {
    if (!command.id) {
      throw new Error("Command requires id");
    }

    const ackPromise = new Promise<Acknowledgement>((resolve, reject) => {
      const timer = setTimeout(() => {
        simulationPendingAcks.delete(command.id);
        reject(new Error(`Timed out waiting for acknowledgement ${command.id}`));
      }, ackTimeoutMs);

      simulationPendingAcks.set(command.id, { resolve, reject, timer });
    });

    simulationInbound.send(command);
    return ackPromise.finally(() => {
      const pending = simulationPendingAcks.get(command.id);
      if (pending) {
        clearTimeout(pending.timer);
        simulationPendingAcks.delete(command.id);
      }
    });
  }

  // Evaluation player setup
  const evaluationComponents = new ComponentManager();
  const evaluationEntities = new EntityManager(evaluationComponents);
  const evaluationSystems = new SystemManager();
  const evaluationTimeComponent = new TimeComponent("evaluation_time");
  const evaluationTime = new TimeSystem(
    evaluationEntities,
    evaluationComponents,
    evaluationTimeComponent,
  );
  evaluationSystems.add(evaluationTime);

  const evaluationInbound = new Bus<CommandMessage>();
  const evaluationOutbound = new Bus<OutboundEvent>();

  let evaluationLoopHandle: IntervalLoop | null = null;
  const evaluationLoop: LoopController = {
    start: (cb) => {
      evaluationLoopHandle?.stop();
      evaluationLoopHandle = new IntervalLoop(cb, options?.loopIntervalMs ?? 20);
    },
    stop: () => {
      evaluationLoopHandle?.stop();
      evaluationLoopHandle = null;
    },
  };

  const evaluationPlayer = new EvaluationPlayer(
    evaluationEntities,
    evaluationComponents,
    evaluationSystems,
    evaluationLoop,
    evaluationInbound,
    evaluationOutbound,
    evaluationTime,
    evaluationTimeComponent,
  );

  const evaluationPendingAcks = new Map<string, PendingAck>();
  let latestEvaluationFrame: Frame | null = null;
  const evaluationSnapshots = new Map<string, Frame>();

  const serverCwd = process.cwd();

  const unsubscribeEvaluation = evaluationOutbound.subscribe((event) => {
    if (event.kind === "ack") {
      const pending = evaluationPendingAcks.get(event.ack.id);
      if (pending) {
        clearTimeout(pending.timer);
        evaluationPendingAcks.delete(event.ack.id);
        pending.resolve(event.ack);
      }
    }

    if (event.kind === "frame") {
      latestEvaluationFrame = event.frame;
    }
  });

  function sanitizeSnapshotName(name: string): string {
    return name.replace(/[^a-z0-9-_]/gi, "_");
  }

  const snapshotDir = path.join(serverCwd, "verifications", "snapshots");
  void (async () => {
    try {
      await fs.mkdir(snapshotDir, { recursive: true });
      const files = await fs.readdir(snapshotDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const contents = await fs.readFile(path.join(snapshotDir, file), "utf-8");
        const frame = JSON.parse(contents) as Frame;
        const name = file.slice(0, -5);
        evaluationSnapshots.set(name, frame);
      }
    } catch {
      /* ignore bootstrap failures */
    }
  })();

  async function persistSnapshot(name: string, frame: Frame): Promise<void> {
    await fs.mkdir(snapshotDir, { recursive: true });
    await fs.writeFile(path.join(snapshotDir, `${sanitizeSnapshotName(name)}.json`), JSON.stringify(frame, null, 2), "utf-8");
  }

  async function fetchSnapshot(name: string): Promise<Frame | null> {
    const cached = evaluationSnapshots.get(name);
    if (cached) {
      return cached;
    }
    try {
      const contents = await fs.readFile(path.join(snapshotDir, `${sanitizeSnapshotName(name)}.json`), "utf-8");
      const frame = JSON.parse(contents) as Frame;
      evaluationSnapshots.set(name, frame);
      return frame;
    } catch {
      return null;
    }
  }

  async function sendEvaluationCommand(command: CommandMessage): Promise<Acknowledgement> {
    if (!command.id) {
      throw new Error("Command requires id");
    }

    const ackPromise = new Promise<Acknowledgement>((resolve, reject) => {
      const timer = setTimeout(() => {
        evaluationPendingAcks.delete(command.id);
        reject(new Error(`Timed out waiting for acknowledgement ${command.id}`));
      }, ackTimeoutMs);

      evaluationPendingAcks.set(command.id, { resolve, reject, timer });
    });

    evaluationInbound.send(command);
    return ackPromise.finally(() => {
      const pending = evaluationPendingAcks.get(command.id);
      if (pending) {
        clearTimeout(pending.timer);
        evaluationPendingAcks.delete(command.id);
      }
    });
  }

  const router = new Router();

  registerSimulationRoutes(router, {
    sendCommand: sendSimulationCommand,
    getLatestFrame: () => latestFrame,
  });
  registerEvaluationRoutes(router, {
    sendCommand: sendEvaluationCommand,
    getLatestFrame: () => latestEvaluationFrame,
    listSnapshots: async () => Array.from(evaluationSnapshots.keys()),
    saveSnapshot: async (name, frame) => {
      const snapshot = frame ?? latestEvaluationFrame;
      if (!snapshot) {
        throw new Error("No evaluation frame available to snapshot");
      }
      evaluationSnapshots.set(name, snapshot);
      await persistSnapshot(name, snapshot);
    },
    getSnapshot: async (name) => fetchSnapshot(name),
    loadSnapshot: async (name) => {
      const snapshot = await fetchSnapshot(name);
      if (!snapshot) {
        throw new Error("Snapshot not found");
      }
      latestEvaluationFrame = snapshot;
      evaluationPlayer.loadFrame(snapshot);
    },
  });

  registerCodebaseRoutes(router, {
    async listEntries(dir) {
      const resolvedDir = dir ? path.resolve(serverCwd, dir) : serverCwd;
        if (!resolvedDir.startsWith(serverCwd)) {
        throw new Error("Path outside repository");
      }

      let dirents;
      try {
        dirents = await fs.readdir(resolvedDir, { withFileTypes: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return [];
        }
        throw error;
      }

      const entries = await Promise.all(
        dirents.map(async (dirent) => {
          const absolutePath = path.join(resolvedDir, dirent.name);
          const relativePath = path.relative(serverCwd, absolutePath) || dirent.name;
          if (dirent.isDirectory()) {
            return { path: relativePath, type: "directory" as const };
          }
          const stats = await fs.stat(absolutePath);
          return { path: relativePath, type: "file" as const, size: stats.size };
        }),
      );

      return entries;
    },
    async readFile(targetPath: string) {
      const resolved = path.resolve(serverCwd, targetPath);
      if (!resolved.startsWith(serverCwd)) {
        throw new Error("Path outside repository");
      }
      const content = await fs.readFile(resolved, "utf-8");
      const stats = await fs.stat(resolved);
      return { content, size: stats.size };
    },
  });

  const server = http.createServer((req, res) => router.handle(req, res));

  return {
    server,
    player: simulationPlayer,
    sendSimulationCommand: sendSimulationCommand,
    getSimulationFrame: () => latestFrame,
    sendEvaluationCommand,
    getEvaluationFrame: () => latestEvaluationFrame,
    listEvaluationSnapshots: async () => Array.from(evaluationSnapshots.keys()),
    saveEvaluationSnapshot: async (name: string, frame?: Frame) => {
      const snapshot = frame ?? latestEvaluationFrame;
      if (!snapshot) {
        throw new Error("No evaluation frame available to snapshot");
      }
      evaluationSnapshots.set(name, snapshot);
      await persistSnapshot(name, snapshot);
    },
    loadEvaluationSnapshot: async (name: string) => {
      const snapshot = await fetchSnapshot(name);
      if (!snapshot) {
        throw new Error("Snapshot not found");
      }
      latestEvaluationFrame = snapshot;
      evaluationPlayer.loadFrame(snapshot);
    },
    async start(port = 0) {
      await new Promise<void>((resolve, reject) => {
        const onError = (err: Error) => {
          server.off("error", onError);
          reject(err);
        };
        server.once("error", onError);
        server.listen({ port, host: "127.0.0.1" }, () => {
          server.off("error", onError);
          resolve();
        });
      });
      const address = server.address();
      if (address && typeof address === "object") {
        return address.port;
      }
      throw new Error("Server address unavailable after start");
    },
    async stop() {
      unsubscribeSimulation();
      unsubscribeEvaluation();
      simulationLoopHandle?.stop();
      evaluationLoopHandle?.stop();
      simulationPlayer.dispose();
      evaluationPlayer.dispose();
      await new Promise<void>((resolve, reject) => {
        if (!server.listening) {
          resolve();
          return;
        }

        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}
