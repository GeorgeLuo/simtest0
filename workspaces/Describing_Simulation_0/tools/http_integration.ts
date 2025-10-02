import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { setTimeout as wait } from "timers/promises";
import { createSimulationServer } from "../src/server";
import type { CommandMessage } from "../src/core/player/IOPlayer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceDir = path.resolve(__dirname, "..");
const outputDir = path.join(workspaceDir, "verifications");
const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
const runDirEnv = process.env.HTTP_RUN_DIR;
const runDir = runDirEnv ? path.resolve(runDirEnv) : path.join(outputDir, `${timestamp}-http`);
const logPath = path.join(runDir, "http_log.json");

interface LogEntry {
  step: string;
  request: { method: string; path: string; body?: unknown };
  response?: { status: number; body?: unknown };
  error?: string;
}

const logEntries: LogEntry[] = [];

function record(entry: LogEntry) {
  logEntries.push(entry);
}

type ResponseRecord = { status: number; body?: unknown };

function expectCondition(condition: boolean, step: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[${step}] ${message}`);
  }
}

function expectStatus(step: string, response: ResponseRecord, expectedStatus: number): unknown {
  expectCondition(response.status === expectedStatus, step, `expected status ${expectedStatus}, received ${response.status}`);
  return response.body;
}

async function writeLog() {
  await fs.writeFile(logPath, JSON.stringify(logEntries, null, 2), "utf-8");
}

async function main() {
  await fs.mkdir(runDir, { recursive: true });

  const server = createSimulationServer({ loopIntervalMs: 20 });
  let port: number;
  try {
    port = await server.start(0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EPERM") {
      record({ step: "startup", request: { method: "LISTEN", path: "*" }, error: "Socket binding not permitted; HTTP integration skipped" });
      await writeLog();
      return;
    }
    throw error;
  }

  const base = `http://127.0.0.1:${port}`;

  const request = async (method: string, path: string, body?: unknown) => {
    const entry: LogEntry = { step: `HTTP ${method} ${path}`, request: { method, path, body } };
    try {
      const res = await fetch(`${base}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      let payload: unknown;
      const text = await res.text();
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = text;
        }
      }
      entry.response = { status: res.status, body: payload };
      record(entry);
      return { status: res.status, body: payload } satisfies ResponseRecord;
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
      record(entry);
      throw error;
    }
  };

  try {
    const root = await request("GET", "/");
    const rootBody = expectStatus("GET /", root, 200);
    expectCondition(typeof rootBody === "object" && rootBody !== null, "GET /", "missing response body");
    expectCondition(
      Object.prototype.hasOwnProperty.call(rootBody as Record<string, unknown>, "endpoints"),
      "GET /",
      "missing endpoints descriptor",
    );

    const malformedStart = await request("POST", "/commands", { type: "start" });
    expectStatus("POST /commands (malformed)", malformedStart, 400);

    const startAck = await request("POST", "/commands", { id: "sim-start", type: "start" } satisfies CommandMessage);
    const startBody = expectStatus("POST /commands (start)", startAck, 200) as { acknowledgement?: { status?: string } };
    expectCondition(startBody.acknowledgement?.status === "ok", "POST /commands (start)", "missing ok acknowledgement");

    const modulePath = path.join(workspaceDir, "src/simulations/temperature/index.ts");

    const badInject = await request("POST", "/commands", {
      id: "sim-inject-invalid",
      type: "inject",
      payload: { modulePath: path.join("/not", "real", "module.mjs") },
    } satisfies CommandMessage);
    expectStatus("POST /commands (invalid inject)", badInject, 400);

    const injectAck = await request("POST", "/commands", {
      id: "sim-inject-temperature",
      type: "inject",
      payload: {
        modulePath,
        exportName: "createTemperatureControlSystems",
        options: {
          initial: 18,
          target: 22,
          tolerance: 0.5,
          ambient: 18,
          heatRate: 1,
          coolRate: 0.4,
        },
      },
    } satisfies CommandMessage);
    const injectBody = expectStatus("POST /commands (inject)", injectAck, 200) as { acknowledgement?: { status?: string } };
    expectCondition(injectBody.acknowledgement?.status === "ok", "POST /commands (inject)", "missing ok acknowledgement");

    const configAck = await request("POST", "/commands", {
      id: "sim-config-temperature",
      type: "temperature-config",
      payload: {
        target: 19,
        heatRate: 0.5,
        coolRate: 1.2,
      },
    } satisfies CommandMessage);
    const configBody = expectStatus("POST /commands (config)", configAck, 200) as { acknowledgement?: { status?: string } };
    expectCondition(configBody.acknowledgement?.status === "ok", "POST /commands (config)", "missing ok acknowledgement");

    const evalInjectAck = await request("POST", "/evaluation/commands", {
      id: "eval-inject-temperature",
      type: "inject",
      payload: {
        modulePath,
        exportName: "createTemperatureControlSystems",
        options: {
          initial: 18,
          target: 22,
          tolerance: 0.5,
          ambient: 18,
          heatRate: 1,
          coolRate: 0.4,
        },
      },
    } satisfies CommandMessage);
    const evalInjectBody = expectStatus("POST /evaluation/commands (inject)", evalInjectAck, 200) as {
      acknowledgement?: { status?: string };
    };
    expectCondition(
      evalInjectBody.acknowledgement?.status === "ok",
      "POST /evaluation/commands (inject)",
      "missing ok acknowledgement",
    );

    const evalConfigAck = await request("POST", "/evaluation/commands", {
      id: "eval-config-temperature",
      type: "temperature-config",
      payload: {
        target: 19,
        heatRate: 0.5,
        coolRate: 1.2,
      },
    } satisfies CommandMessage);
    const evalConfigBody = expectStatus("POST /evaluation/commands (config)", evalConfigAck, 200) as {
      acknowledgement?: { status?: string };
    };
    expectCondition(
      evalConfigBody.acknowledgement?.status === "ok",
      "POST /evaluation/commands (config)",
      "missing ok acknowledgement",
    );

    await wait(200);

    for (let i = 0; i < 3; i += 1) {
      const frameResponse = await request("GET", "/frames/latest");
      const frameBody = expectStatus(`GET /frames/latest [${i}]`, frameResponse, 200) as { frame?: unknown };
      expectCondition(frameBody.frame !== undefined, `GET /frames/latest [${i}]`, "missing frame payload");
      await wait(100);
    }

    const pauseAck = await request("POST", "/commands", { id: "sim-pause", type: "pause" } satisfies CommandMessage);
    expectCondition(
      (expectStatus("POST /commands (pause)", pauseAck, 200) as { acknowledgement?: { status?: string } }).acknowledgement?.status ===
        "ok",
      "POST /commands (pause)",
      "missing ok acknowledgement",
    );
    const resumeAck = await request("POST", "/commands", { id: "sim-resume", type: "start" } satisfies CommandMessage);
    expectCondition(
      (expectStatus("POST /commands (resume)", resumeAck, 200) as { acknowledgement?: { status?: string } }).acknowledgement?.status ===
        "ok",
      "POST /commands (resume)",
      "missing ok acknowledgement",
    );

    const evalStartAck = await request("POST", "/evaluation/commands", { id: "eval-start", type: "start" } satisfies CommandMessage);
    expectCondition(
      (expectStatus("POST /evaluation/commands (start)", evalStartAck, 200) as { acknowledgement?: { status?: string } })
        .acknowledgement?.status === "ok",
      "POST /evaluation/commands (start)",
      "missing ok acknowledgement",
    );

    await wait(200);

    const evalFrame = await request("GET", "/evaluation/frames/latest");
    const evalFrameBody = expectStatus("GET /evaluation/frames/latest", evalFrame, 200) as { frame?: unknown };
    expectCondition(evalFrameBody.frame !== undefined, "GET /evaluation/frames/latest", "missing frame payload");

    const snapshotAck = await request("POST", "/evaluation/snapshots", { name: "http-integration" });
    const snapshotBody = expectStatus("POST /evaluation/snapshots", snapshotAck, 200) as { snapshot?: { name?: string } };
    expectCondition(snapshotBody.snapshot?.name === "http-integration", "POST /evaluation/snapshots", "snapshot name not persisted");

    const snapshotGet = await request("GET", "/evaluation/snapshot?name=http-integration");
    const snapshotGetBody = expectStatus("GET /evaluation/snapshot", snapshotGet, 200) as { snapshot?: unknown };
    expectCondition(snapshotGetBody.snapshot !== undefined, "GET /evaluation/snapshot", "missing snapshot payload");

    const snapshotLoad = await request("POST", "/evaluation/snapshot/load", { name: "http-integration" });
    const snapshotLoadBody = expectStatus("POST /evaluation/snapshot/load", snapshotLoad, 200) as { loaded?: string };
    expectCondition(snapshotLoadBody.loaded === "http-integration", "POST /evaluation/snapshot/load", "snapshot not loaded");

    const malformedEval = await request("POST", "/evaluation/commands", { type: "start" });
    expectStatus("POST /evaluation/commands (malformed)", malformedEval, 400);

    const forbiddenFile = await request("GET", "/codebase/file?path=/etc/passwd");
    expectStatus("GET /codebase/file (forbidden)", forbiddenFile, 404);
  } finally {
    await server.stop();
    await writeLog();
  }
}

main().catch(async (error) => {
  logEntries.push({ step: "error", request: { method: "-", path: "-" }, error: error instanceof Error ? error.message : String(error) });
  await writeLog();
  process.exitCode = 1;
});
