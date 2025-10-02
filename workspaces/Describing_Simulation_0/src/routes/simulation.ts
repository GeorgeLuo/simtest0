import type { IncomingMessage, ServerResponse } from "http";
import type { Router, RouteHandler as RouterHandler } from "./router";
import type { CommandMessage } from "../core/player/IOPlayer";
import type { Acknowledgement } from "../core/messaging/outbound/Acknowledgement";
import type { Frame } from "../core/messaging/outbound/Frame";

export interface SimulationRouteContext {
  sendCommand(command: CommandMessage): Promise<Acknowledgement>;
  getLatestFrame(): Frame | null;
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    throw new Error("Empty request body");
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

export interface SimulationRouteDefinition {
  method: string;
  path: string;
  handler: RouterHandler;
}

export function simulationRouteDefinitions(context: SimulationRouteContext): SimulationRouteDefinition[] {
  return [
    {
      method: "GET",
      path: "/",
      handler: (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            endpoints: {
              commands: "/commands",
              latestFrame: "/frames/latest",
            },
          }),
        );
      },
    },
    {
      method: "POST",
      path: "/commands",
      handler: async (req, res) => {
        try {
          const command = (await readJson<CommandMessage>(req)) as CommandMessage;
          if (!command?.id || !command.type) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Command must include id and type" }));
            return;
          }

          const acknowledgement = await context.sendCommand(command);
          res.statusCode = acknowledgement.status === "error" ? 400 : 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ acknowledgement }));
        } catch (error) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      },
    },
    {
      method: "GET",
      path: "/frames/latest",
      handler: (_req, res) => {
        const frame = context.getLatestFrame();
        if (!frame) {
          res.statusCode = 204;
          res.end();
          return;
        }

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ frame }));
      },
    },
  ];
}

export function registerSimulationRoutes(router: Router, context: SimulationRouteContext): void {
  for (const route of simulationRouteDefinitions(context)) {
    router.register(route.method, route.path, route.handler);
  }
}
