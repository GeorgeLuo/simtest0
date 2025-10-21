import { fileURLToPath } from "node:url";
import path from "node:path";
import * as fs from "node:fs/promises";
import { Server, ServerConfig } from "./server/Server.js";
import { Router } from "./routes/router.js";
import { registerInformationRoutes } from "./routes/information/index.js";
import { registerSimulationRoutes } from "./routes/simulation.js";
import { registerEvaluationRoutes } from "./routes/evaluation.js";
import { registerSystemRoutes } from "./routes/system.js";
import {
  registerCodebaseRoutes,
  CodebaseRouteDependencies,
} from "./routes/codebase.js";
import { Bus } from "./core/messaging/Bus.js";
import { InboundHandlerRegistry } from "./core/messaging/inbound/InboundHandlerRegistry.js";
import { SimulationPlayer } from "./core/simplayer/SimulationPlayer.js";
import {
  EvaluationPlayer,
  EVALUATION_FRAME_MESSAGE,
} from "./core/evalplayer/EvaluationPlayer.js";
import { ComponentManager } from "./core/components/ComponentManager.js";
import { EntityManager } from "./core/entity/EntityManager.js";
import { SystemManager } from "./core/systems/SystemManager.js";
import { InboundMessage } from "./core/messaging/inbound/InboundMessage.js";
import { OutboundMessage } from "./core/messaging/outbound/OutboundMessage.js";

const DEFAULT_CONFIG: ServerConfig = {
  port: 3000,
  host: "0.0.0.0",
};

const ACK_TIMEOUT_MS = 1_000;

export const createServer = (configOverrides: Partial<ServerConfig> = {}): Server => {
  const config: ServerConfig = {
    ...DEFAULT_CONFIG,
    ...configOverrides,
  };

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(moduleDir, "..");
  const informationDirectory = path.join(projectRoot, "src", "routes", "information");
  const describingSimulationPath = path.join(informationDirectory, "Describing_Simulation.md");
  const apiDocumentPath = path.join(informationDirectory, "api.md");
  const pluginDirectory = path.join(projectRoot, "plugins");

  const simulationInboundBus = new Bus<InboundMessage>();
  const simulationOutboundBus = new Bus<OutboundMessage>();
  const evaluationInboundBus = new Bus<InboundMessage>();
  const evaluationOutboundBus = new Bus<OutboundMessage>();

  const simulationPlayer = createSimulationPlayer(
    simulationInboundBus,
    simulationOutboundBus,
    pluginDirectory,
  );
  const evaluationPlayer = createEvaluationPlayer(
    evaluationInboundBus,
    evaluationOutboundBus,
  );

  const router = new Router();
  const createMessageId = createMessageIdFactory();
  const cleanupTasks: Array<() => void> = [];

  cleanupTasks.push(pipeSimulationFramesToEvaluation(
    simulationOutboundBus,
    evaluationInboundBus,
    createMessageId,
  ));

  registerSimulationRoutes(router, {
    player: simulationPlayer,
    inboundBus: simulationInboundBus,
    outboundBus: simulationOutboundBus,
    createMessageId,
    acknowledgementTimeoutMs: ACK_TIMEOUT_MS,
  });

  registerEvaluationRoutes(router, {
    player: evaluationPlayer,
    inboundBus: evaluationInboundBus,
    outboundBus: evaluationOutboundBus,
    createMessageId,
    acknowledgementTimeoutMs: ACK_TIMEOUT_MS,
  });

  registerInformationRoutes(router, {
    describingSimulationPath,
    apiDocumentPath,
    readFile: (documentPath) => fs.readFile(documentPath, "utf-8"),
    metadata: {
      project: "sim-eval",
      documents: [describingSimulationPath, apiDocumentPath],
    },
  });

  registerSystemRoutes(router, {
    collectHealth: () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
      routes: router.getRoutes().map((definition) => ({
        method: definition.method,
        path: definition.path,
      })),
    }),
    collectStatus: () => ({
      simulation: {
        running: simulationPlayer.isRunning(),
        tick: simulationPlayer.getTick(),
      },
      evaluation: {
        running: evaluationPlayer.isRunning(),
        tick: evaluationPlayer.getTick(),
      },
    }),
  });

  registerCodebaseRoutes(router, createCodebaseDependencies(projectRoot, pluginDirectory));

  const cleanup = () => {
    while (cleanupTasks.length > 0) {
      const task = cleanupTasks.pop();
      try {
        task?.();
      } catch {
        // ignore cleanup errors
      }
    }
  };

  return new Server(config, {
    router,
    simulationPlayer,
    evaluationPlayer,
    cleanup,
  });
};

export async function main(): Promise<void> {
  const module = await import("./main.js");
  const server = module.createServer();
  await server.start();
}

const entryPoint = process.argv[1]
  ? path.resolve(process.argv[1])
  : null;
const currentModulePath = fileURLToPath(import.meta.url);

if (entryPoint && entryPoint === currentModulePath) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

function createSimulationPlayer(
  inboundBus: Bus<InboundMessage>,
  outboundBus: Bus<OutboundMessage>,
  pluginDirectory: string,
): SimulationPlayer {
  const componentManager = new ComponentManager();
  const entityManager = new EntityManager(componentManager);
  const systemManager = new SystemManager();
  const inboundRegistry = new InboundHandlerRegistry();

  return new SimulationPlayer({
    componentManager,
    entityManager,
    systemManager,
    inboundBus,
    outboundBus,
    inboundRegistry,
    pluginDirectory,
  });
}

function createEvaluationPlayer(
  inboundBus: Bus<InboundMessage>,
  outboundBus: Bus<OutboundMessage>,
): EvaluationPlayer {
  const componentManager = new ComponentManager();
  const entityManager = new EntityManager(componentManager);
  const systemManager = new SystemManager();
  const inboundRegistry = new InboundHandlerRegistry();

  return new EvaluationPlayer({
    componentManager,
    entityManager,
    systemManager,
    inboundBus,
    outboundBus,
    inboundRegistry,
  });
}

function pipeSimulationFramesToEvaluation(
  simulationOutboundBus: Bus<OutboundMessage>,
  evaluationInboundBus: Bus<InboundMessage>,
  createMessageId: () => string,
): () => void {
  return simulationOutboundBus.subscribe((message) => {
    if (message.type !== "frame") {
      return;
    }

    evaluationInboundBus.publish({
      id: createMessageId(),
      type: EVALUATION_FRAME_MESSAGE,
      payload: {
        frame: message.frame,
      },
    });
  });
}

function createMessageIdFactory(): () => string {
  let sequence = 1;
  return () => `msg-${sequence++}`;
}

function createCodebaseDependencies(
  rootDirectory: string,
  pluginDirectory: string,
): CodebaseRouteDependencies {
  return {
    rootDirectory,
    pluginDirectory,
    fs: {
      readFile: (filePath, encoding) => fs.readFile(filePath, encoding),
      writeFile: (filePath, data) => fs.writeFile(filePath, data),
      mkdir: async (directoryPath, options) => {
        await fs.mkdir(directoryPath, options);
      },
      readdir: (directoryPath, options) => fs.readdir(directoryPath, options),
      stat: (filePath) => fs.stat(filePath),
    },
    path: {
      resolve: (...segments) => path.resolve(...segments),
      join: (...segments) => path.join(...segments),
      normalize: (value) => path.normalize(value),
    },
  };
}
