import { describe, expect, it } from "vitest";
import type { IncomingMessage, ServerResponse } from "http";
import { simulationRouteDefinitions } from "../src/routes/simulation";
import { evaluationRouteDefinitions } from "../src/routes/evaluation";
import { codebaseRouteDefinitions } from "../src/routes/codebase";
import type { CommandMessage } from "../src/core/player/IOPlayer";
import type { Frame } from "../src/core/messaging/outbound/Frame";
import type { Acknowledgement } from "../src/core/messaging/outbound/Acknowledgement";
import { URL } from "url";

function createResponse() {
  let body: string | null = null;
  const headers: Record<string, string> = {};
  let status = 200;
  const res = {} as ServerResponse;

  Object.defineProperty(res, "statusCode", {
    get: () => status,
    set: (code: number) => {
      status = code;
    },
    configurable: true,
  });

  (res as unknown as { setHeader: ServerResponse["setHeader"] }).setHeader = (name, value) => {
    headers[name.toLowerCase()] = value;
  };

  (res as unknown as { end: ServerResponse["end"] }).end = (chunk?: string | Buffer) => {
    if (typeof chunk === "string") {
      body = chunk;
    } else if (Buffer.isBuffer(chunk)) {
      body = chunk.toString("utf-8");
    } else {
      body = null;
    }
  };

  return {
    res,
    getBody: () => body,
    getHeaders: () => headers,
    getStatus: () => status,
  };
}

function createRequest(body?: unknown): IncomingMessage {
  if (body === undefined) {
    return {
      method: "GET",
      headers: {},
    } as unknown as IncomingMessage;
  }

  const payload = JSON.stringify(body);
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(payload);
    },
  } as unknown as IncomingMessage;
}

describe("Route definitions", () => {
  it("handles simulation command flow", async () => {
    const commands: CommandMessage[] = [];
    const ack: Acknowledgement = { id: "cmd-1", status: "ok" };
    const frame: Frame = { tick: 1, entities: [] };

    const routes = simulationRouteDefinitions({
      sendCommand: async (command) => {
        commands.push(command);
        return ack;
      },
      getLatestFrame: () => frame,
    });

    const commandRoute = routes.find((route) => route.path === "/commands");
    expect(commandRoute).toBeDefined();
    const commandRes = createResponse();
    await commandRoute!.handler(
      createRequest({ id: "cmd-1", type: "start" }),
      commandRes.res,
      { url: new URL("http://localhost/commands") },
    );

    expect(commandRes.getStatus()).toBe(200);
    expect(commands).toHaveLength(1);
    expect(JSON.parse(commandRes.getBody() ?? "{}").acknowledgement.status).toBe("ok");

    const frameRoute = routes.find((route) => route.path === "/frames/latest");
    const frameRes = createResponse();
    frameRoute!.handler(
      createRequest(),
      frameRes.res,
      { url: new URL("http://localhost/frames/latest") },
    );
    expect(frameRes.getStatus()).toBe(200);
    expect(JSON.parse(frameRes.getBody() ?? "{}").frame.tick).toBe(1);
  });

  it("handles evaluation routes with snapshots", async () => {
    let latest: Frame | null = null;
    const stored = new Map<string, Frame>();
    let loaded: string | null = null;
    const definitions = evaluationRouteDefinitions({
      sendCommand: async () => ({ id: "eval-1", status: "ok" }),
      getLatestFrame: () => latest,
      listSnapshots: async () => Array.from(stored.keys()),
      saveSnapshot: async (name, frame) => {
        stored.set(name, frame);
      },
      getSnapshot: async (name) => stored.get(name) ?? null,
      loadSnapshot: async (name) => {
        const snapshot = stored.get(name);
        if (!snapshot) {
          throw new Error("Snapshot not found");
        }
        latest = snapshot;
        loaded = name;
      },
    });

    stored.set("snapshot-1", { tick: 10, entities: [] });

    const rootRoute = definitions.find((route) => route.path === "/evaluation");
    const rootRes = createResponse();
    await rootRoute!.handler(
      createRequest(),
      rootRes.res,
      { url: new URL("http://localhost/evaluation") },
    );

    const payload = JSON.parse(rootRes.getBody() ?? "{}");
    expect(payload.snapshots).toEqual(["snapshot-1"]);

    const framesRoute = definitions.find((route) => route.path === "/evaluation/frames/latest");
    const framesRes = createResponse();
    framesRoute!.handler(
      createRequest(),
      framesRes.res,
      { url: new URL("http://localhost/evaluation/frames/latest") },
    );
    expect(framesRes.getStatus()).toBe(204);

    latest = { tick: 2, entities: [] };
    const snapshotPost = definitions.find((route) => route.method === "POST" && route.path === "/evaluation/snapshots");
    const postRes = createResponse();
    await snapshotPost!.handler(
      createRequest({ name: "snap" }),
      postRes.res,
      { url: new URL("http://localhost/evaluation/snapshots") },
    );
    expect(postRes.getStatus()).toBe(200);
    expect(JSON.parse(postRes.getBody() ?? "{}").snapshot.name).toBe("snap");

    const snapshotGet = definitions.find((route) => route.path === "/evaluation/snapshot");
    const snapshotRes = createResponse();
    await snapshotGet!.handler(
      createRequest(),
      snapshotRes.res,
      { url: new URL("http://localhost/evaluation/snapshot?name=snap") },
    );
    expect(JSON.parse(snapshotRes.getBody() ?? "{}").snapshot.tick).toBe(2);

    const loadRoute = definitions.find((route) => route.path === "/evaluation/snapshot/load");
    const loadRes = createResponse();
    await loadRoute!.handler(
      createRequest({ name: "snap" }),
      loadRes.res,
      { url: new URL("http://localhost/evaluation/snapshot/load") },
    );
    expect(JSON.parse(loadRes.getBody() ?? "{}").loaded).toBe("snap");
    expect(loaded).toBe("snap");
  });

  it("handles codebase list and read routes", async () => {
    const definitions = codebaseRouteDefinitions({
      listEntries: async (dir) => [
        { path: dir ? `${dir}/nested` : "src", type: "directory" as const },
        { path: dir ? `${dir}/file.ts` : "index.ts", type: "file" as const, size: 42 },
      ],
      readFile: async (p) => ({ content: `content-of-${p}`, size: 10 }),
    });

    const listRoute = definitions.find((route) => route.path === "/codebase");
    const listRes = createResponse();
    await listRoute!.handler(
      createRequest(),
      listRes.res,
      { url: new URL("http://localhost/codebase?dir=src") },
    );
    const listPayload = JSON.parse(listRes.getBody() ?? "{}");
    expect(listPayload.entries.some((entry: unknown) => (entry as any).type === "directory")).toBe(true);

    const fileRoute = definitions.find((route) => route.path === "/codebase/file");
    const fileRes = createResponse();
    await fileRoute!.handler(
      createRequest(),
      fileRes.res,
      { url: new URL("http://localhost/codebase/file?path=index.ts") },
    );
    const filePayload = JSON.parse(fileRes.getBody() ?? "{}");
    expect(filePayload.file.content).toBe("content-of-index.ts");
    expect(filePayload.file.size).toBe(10);
  });
});
