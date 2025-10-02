import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createSimulationServer } from "../src/server";
import http from "http";

const PERMISSION_DENIED_CODES = new Set(["EPERM", "EACCES"]);

let skipSuite = false;
let skipReason: string | undefined;

await (async () => {
  const probe = createSimulationServer({ loopIntervalMs: 10 });
  let started = false;
  try {
    await probe.start(0);
    started = true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code && PERMISSION_DENIED_CODES.has(code)) {
      skipSuite = true;
      skipReason = code;
      return;
    }
    throw error;
  } finally {
    if (started) {
      await probe.stop();
    } else {
      await probe.stop().catch(() => {});
    }
  }
})();

const describeSuite = skipSuite ? describe.skip : describe;
const suiteTitle = skipSuite && skipReason ? `Simulation server (${skipReason} — skipped)` : "Simulation server";

async function httpRequest<T = unknown>(options: http.RequestOptions & { body?: unknown }): Promise<{ status: number; json?: T }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const payload = Buffer.concat(chunks).toString("utf-8");
        let json;
        if (payload.length > 0) {
          try {
            json = JSON.parse(payload);
          } catch (error) {
            reject(error);
            return;
          }
        }
        resolve({ status: res.statusCode ?? 0, json });
      });
    });

    req.on("error", reject);

    if (options.body !== undefined) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

describeSuite(suiteTitle, () => {
  let port: number;
  const servers: { stop: () => Promise<void> }[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    for (const server of servers.splice(0)) {
      await server.stop();
    }
    vi.useRealTimers();
  });

  it("accepts commands and returns frames", async () => {
    const simulation = createSimulationServer({ loopIntervalMs: 10 });
    try {
      port = await simulation.start(0);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code && PERMISSION_DENIED_CODES.has(code)) {
        await simulation.stop().catch(() => {});
        return;
      }
      throw error;
    }
    servers.push(simulation);

    const startResponse = await httpRequest<{ acknowledgement: { status: string } }>({
      hostname: "127.0.0.1",
      port,
      path: "/commands",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { id: "start", type: "start" },
    });

    expect(startResponse.status).toBe(200);
    expect(startResponse.json?.acknowledgement.status).toBe("ok");

    vi.advanceTimersByTime(100);

    const frameResponse = await httpRequest<{ frame: { tick: number } }>({
      hostname: "127.0.0.1",
      port,
      path: "/frames/latest",
      method: "GET",
    });

    expect(frameResponse.status).toBe(200);
    expect(frameResponse.json?.frame.tick).toBeGreaterThan(0);

    const errorResponse = await httpRequest<{ acknowledgement: { status: string } }>({
      hostname: "127.0.0.1",
      port,
      path: "/commands",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { id: "unknown", type: "nope" },
    });

    expect(errorResponse.status).toBe(400);
    expect(errorResponse.json?.acknowledgement.status).toBe("error");
  });
});
