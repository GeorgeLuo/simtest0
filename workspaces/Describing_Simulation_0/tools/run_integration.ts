import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { setTimeout as wait } from "timers/promises";
import { createSimulationServer } from "../src/server";
import type { Frame } from "../src/core/messaging/outbound/Frame";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceDir = path.resolve(__dirname, "..");
const verificationsDir = path.join(workspaceDir, "verifications");
const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
const runDirEnv = process.env.INTEGRATION_RUN_DIR;
const runDir = runDirEnv ? path.resolve(runDirEnv) : path.join(verificationsDir, timestamp);
const logPath = path.join(runDir, "integration.log");
const baselineFramePath = path.join(runDir, "baseline_frame.json");
const temperatureFramePath = path.join(runDir, "temperature_frame.json");
const temperatureTracePath = path.join(runDir, "temperature_trace.json");
const adjustedTracePath = path.join(runDir, "temperature_adjusted_trace.json");
const snapshotPath = path.join(runDir, "evaluation_snapshot.json");

function log(message: string) {
  const line = `[${new Date().toISOString()}] ${message}
`;
  process.stderr.write(line);
  return fs.appendFile(logPath, line, "utf-8");
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJson(file: string, data: unknown) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

function extractTemperature(frame: Frame | null): { value: number; heater: boolean } | null {
  if (!frame) {
    return null;
  }
  const entity = frame.entities.find((entry) =>
    Object.prototype.hasOwnProperty.call(entry.components, "temperature_state"),
  );
  if (!entity) {
    return null;
  }
  const temperatureComponent = entity.components.temperature_state as { value: number } | undefined;
  const heaterComponent = entity.components.heater_state as { active: boolean } | undefined;
  if (!temperatureComponent) {
    return null;
  }
  return { value: temperatureComponent.value, heater: Boolean(heaterComponent?.active) };
}

async function sampleTemperatureTrace(server: ReturnType<typeof createSimulationServer>, samples: number, delayMs: number) {
  const trace: Array<{ tick: number; temperature: number; heater: boolean }> = [];
  for (let i = 0; i < samples; i += 1) {
    if (i > 0) {
      await wait(delayMs);
    }
    const frame = server.getSimulationFrame();
    if (!frame) {
      continue;
    }
    const data = extractTemperature(frame);
    if (!data) {
      continue;
    }
    trace.push({ tick: frame.tick ?? 0, temperature: data.value, heater: data.heater });
  }
  return trace;
}

async function main() {
  await ensureDir(runDir);
  await log(`Workspace: ${workspaceDir}`);

  const server = createSimulationServer({ loopIntervalMs: 20 });

  await log("Issuing start command to simulation player");
  await server.sendSimulationCommand({ id: "sim-start", type: "start" });
  await wait(200);

  const frame = server.getSimulationFrame();
  if (!frame) {
    throw new Error("Simulation frame not available after start");
  }
  await writeJson(baselineFramePath, frame);
  await log(`Captured baseline frame tick=${frame.tick}`);

  const modulePath = path.join(workspaceDir, "src/simulations/temperature/index.ts");
  await log("Injecting temperature control systems");
  await server.sendSimulationCommand({
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
  });

  let temperatureFrame: Frame | null = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = server.getSimulationFrame();
    if (candidate && extractTemperature(candidate)) {
      temperatureFrame = candidate;
      break;
    }
    await wait(100);
  }

  if (!temperatureFrame) {
    throw new Error("Temperature frame missing expected components");
  }

  await writeJson(temperatureFramePath, temperatureFrame);
  await log(`Captured temperature frame tick=${temperatureFrame.tick}`);

  const initialTrace = await sampleTemperatureTrace(server, 10, 100);
  if (initialTrace.length === 0) {
    throw new Error("Temperature trace unavailable after injection");
  }
  await writeJson(temperatureTracePath, initialTrace);
  await log(`Recorded temperature trace samples=${initialTrace.length}`);

  const initialReading = initialTrace[0];
  const laterReading = initialTrace[initialTrace.length - 1];

  await log("Reconfiguring simulation temperature target to induce cooling");
  await server.sendSimulationCommand({
    id: "sim-temperature-config",
    type: "temperature-config",
    payload: {
      target: 19,
      heatRate: 0.5,
      coolRate: 1.2,
    },
  });

  const adjustedTrace = await sampleTemperatureTrace(server, 10, 100);
  await writeJson(adjustedTracePath, adjustedTrace);
  await log(`Recorded adjusted temperature trace samples=${adjustedTrace.length}`);

  if (adjustedTrace.length > 0 && initialReading) {
    const adjustedFinal = adjustedTrace[adjustedTrace.length - 1];
    const newTarget = 19;
    if (initialReading.temperature > newTarget + 0.1 && adjustedFinal.temperature >= initialReading.temperature) {
      throw new Error(
        `Temperature failed to cool after configuration change (${initialReading.temperature} -> ${adjustedFinal.temperature})`,
      );
    }
    if (initialReading.temperature < newTarget - 0.1 && adjustedFinal.temperature <= initialReading.temperature) {
      throw new Error(
        `Temperature failed to warm after configuration change (${initialReading.temperature} -> ${adjustedFinal.temperature})`,
      );
    }
  }

  await log("Injecting temperature control systems into evaluation player");
  await server.sendEvaluationCommand({
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
  });

  await log("Starting evaluation player");
  await server.sendEvaluationCommand({ id: "eval-start", type: "start" });
  await wait(200);

  const evaluationFrame = server.getEvaluationFrame();
  if (!evaluationFrame) {
    throw new Error("Evaluation frame not available after start");
  }
  const evaluationReading = extractTemperature(evaluationFrame);
  if (!evaluationReading) {
    throw new Error("Evaluation frame missing temperature entity after injection");
  }
  await log(`Evaluation frame tick=${evaluationFrame.tick}`);
  await log(`Evaluation temperature=${evaluationReading.value}`);

  await log("Reconfiguring evaluation temperature target");
  await server.sendEvaluationCommand({
    id: "eval-temperature-config",
    type: "temperature-config",
    payload: {
      target: 19,
      heatRate: 0.5,
      coolRate: 1.2,
    },
  });
  await wait(200);

  const evaluationAdjusted = server.getEvaluationFrame();
  const evalAdjustedReading = extractTemperature(evaluationAdjusted ?? null);
  if (evalAdjustedReading) {
    await log(`Evaluation adjusted temperature=${evalAdjustedReading.value}`);
  }

  const snapshotName = "integration";
  await server.saveEvaluationSnapshot(snapshotName, evaluationFrame);
  await log(`Saved evaluation snapshot '${snapshotName}'`);

  const snapshots = await server.listEvaluationSnapshots();
  await log(`Available snapshots: ${snapshots.join(",")}`);

  await server.loadEvaluationSnapshot(snapshotName);
  await log(`Loaded evaluation snapshot '${snapshotName}'`);

  const loadedSnapshot = server.getEvaluationFrame();
  if (!loadedSnapshot) {
    throw new Error("Evaluation frame missing after load");
  }
  if (loadedSnapshot.tick !== evaluationFrame.tick) {
    throw new Error(`Loaded snapshot tick ${loadedSnapshot.tick} does not match saved tick ${evaluationFrame.tick}`);
  }
  await writeJson(snapshotPath, loadedSnapshot as Frame);
  await log(`Snapshot verification tick=${loadedSnapshot.tick}`);

  await server.stop();
  await log("Simulation server stopped");
}

main().catch(async (error) => {
  await log(`Integration failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
