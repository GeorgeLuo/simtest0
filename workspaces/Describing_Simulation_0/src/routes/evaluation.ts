import type { Router, RouteHandler as RouterHandler } from "./router";
import type { IncomingMessage } from "http";
import type { CommandMessage } from "../core/player/IOPlayer";
import type { Acknowledgement } from "../core/messaging/outbound/Acknowledgement";
import type { Frame } from "../core/messaging/outbound/Frame";

export interface EvaluationRouteContext {
  sendCommand(command: CommandMessage): Promise<Acknowledgement>;
  getLatestFrame(): Frame | null;
  listSnapshots(): Promise<string[]>;
  saveSnapshot(name: string, frame?: Frame): Promise<void>;
  getSnapshot(name: string): Promise<Frame | null>;
  loadSnapshot(name: string): Promise<void>;
}

export interface EvaluationRouteDefinition {
  method: string;
  path: string;
  handler: RouterHandler;
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

export function evaluationRouteDefinitions(context: EvaluationRouteContext): EvaluationRouteDefinition[] {
  return [
    {
      method: "GET",
      path: "/evaluation",
      handler: async (_req, res) => {
        const snapshots = await context.listSnapshots();
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            endpoints: {
              commands: "/evaluation/commands",
              latestFrame: "/evaluation/frames/latest",
              snapshots: "/evaluation/snapshots",
              snapshot: "/evaluation/snapshot",
              loadSnapshot: "/evaluation/snapshot/load",
            },
            snapshots,
          }),
        );
      },
    },
    {
      method: "POST",
      path: "/evaluation/commands",
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
      path: "/evaluation/frames/latest",
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
    {
      method: "GET",
      path: "/evaluation/snapshots",
      handler: async (_req, res) => {
        const snapshots = await context.listSnapshots();
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ snapshots }));
      },
    },
    {
      method: "POST",
      path: "/evaluation/snapshots",
      handler: async (req, res) => {
        try {
          const body = await readJson<{ name?: string; frame?: Frame }>(req);
          const name = body?.name ?? `snapshot-${Date.now()}`;
          const frame = body?.frame ?? context.getLatestFrame();
          if (!frame) {
            res.statusCode = 409;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "No frame available for snapshot" }));
            return;
          }
          await context.saveSnapshot(name, frame);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ snapshot: { name } }));
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
      path: "/evaluation/snapshot",
      handler: async (_req, res, params) => {
        const name = params.url.searchParams.get("name");
        if (!name) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Missing name query parameter" }));
          return;
        }
        const snapshot = await context.getSnapshot(name);
        if (!snapshot) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Snapshot not found" }));
          return;
        }
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ snapshot }));
      },
    },
    {
      method: "POST",
      path: "/evaluation/snapshot/load",
      handler: async (req, res, params) => {
        try {
          const body = await readJson<{ name?: string }>(req);
          const name = body?.name ?? params.url.searchParams.get("name");
          if (!name) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Missing snapshot name" }));
            return;
          }

          await context.loadSnapshot(name);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ loaded: name }));
        } catch (error) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      },
    },
  ];
}

export function registerEvaluationRoutes(router: Router, context: EvaluationRouteContext): void {
  for (const route of evaluationRouteDefinitions(context)) {
    router.register(route.method, route.path, route.handler);
  }
}
