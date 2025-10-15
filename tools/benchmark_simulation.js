#!/usr/bin/env node

/*
 * Sim-Eval performance benchmark harness.
 *
 * Captures baseline metrics for the simulation loop by:
 * 1. Starting the compiled workspace server.
 * 2. Injecting the temperature control system.
 * 3. Streaming simulation frames (>=500 ticks) while measuring duration and memory deltas.
 * 4. Persisting metrics under verifications/ for Phase 5 optimization tracking.
 *
 * Requires `npm --prefix workspaces/Describing_Simulation_0 run build` to have been executed.
 */

const path = require('path');
const { promises: fs } = require('fs');

const TARGET_TICKS = 500;
const HOST = '127.0.0.1';
const PORT = 4323;
const RAW_AUTH_TOKEN = process.env.SIMEVAL_AUTH_TOKEN ?? process.env.SIMEVAL_API_TOKEN ?? '';
const AUTH_HEADER_VALUE = RAW_AUTH_TOKEN
  ? RAW_AUTH_TOKEN.startsWith('Bearer ') ? RAW_AUTH_TOKEN : `Bearer ${RAW_AUTH_TOKEN}`
  : null;

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const workspaceDir = path.join(rootDir, 'workspaces', 'Describing_Simulation_0');
  const distMainPath = path.join(workspaceDir, 'dist', 'main.js');

  await ensureDist(distMainPath);

  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { start } = require(distMainPath);

  console.log('[benchmark] Starting SimEval server...');
  const server = await start({ port: PORT, host: HOST, log: () => {}, cycleIntervalMs: 0 });

  let systemId;
  try {
    systemId = await injectTemperatureSystem();
    const results = await measureSimulationPerformance();
    await persistBaseline(rootDir, results);
    console.log('[benchmark] Benchmark completed successfully.');
  } finally {
    console.log('[benchmark] Shutting down server...');
    if (systemId) {
      await ejectSimulationSystem(systemId).catch(() => undefined);
    }
    await stopSimulation().catch(() => undefined);
    await server.stop();
  }
}

async function ensureDist(distMainPath) {
  try {
    await fs.access(distMainPath);
  } catch {
    throw new Error(
      `Compiled workspace not found at ${distMainPath}. Run ` +
        '`npm --prefix workspaces/Describing_Simulation_0 run build` before benchmarking.',
    );
  }
}

async function injectTemperatureSystem() {
  console.log('[benchmark] Injecting temperature control system...');
  const response = await fetchJson('POST', '/api/simulation/inject', {
    messageId: 'benchmark-inject',
    system: {
      modulePath: 'plugins/simulation/systems/temperatureControlSystem.js',
      exportName: 'createTemperatureControlSystem',
    },
  });

  if (response.status !== 'success') {
    throw new Error(`System injection failed: ${response.detail ?? 'unknown error'}`);
  }

  if (typeof response.systemId !== 'string' || response.systemId.length === 0) {
    throw new Error('Injection response missing systemId');
  }

  return response.systemId;
}

async function stopSimulation() {
  await fetchJson('POST', '/api/simulation/stop', { messageId: 'benchmark-stop' });
}

async function ejectSimulationSystem(systemId) {
  await fetchJson('POST', '/api/simulation/eject', { messageId: 'benchmark-eject', systemId });
}

async function measureSimulationPerformance() {
  console.log(`[benchmark] Measuring ${TARGET_TICKS} simulation ticks...`);

  const streamController = new AbortController();
  const response = await fetch(resourceUrl('/api/simulation/stream'), applyAuth({ signal: streamController.signal }));
  if (!response.ok) {
    streamController.abort();
    throw new Error(`Unable to open simulation stream (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    streamController.abort();
    throw new Error('Simulation stream missing readable body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  const startMemory = captureMemoryUsage();
  const startTime = process.hrtime.bigint();

  await fetchJson('POST', '/api/simulation/start', { messageId: 'benchmark-start' });

  let frames = 0;
  let firstTickTime = null;
  let lastTickTime = null;
  let lastTick = -1;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      if (value) {
        buffer += decoder.decode(value, { stream: true });
      }

      let delimiter;
      while ((delimiter = buffer.indexOf('\n\n')) >= 0) {
        const chunk = buffer.slice(0, delimiter).trim();
        buffer = buffer.slice(delimiter + 2);

        if (!chunk.startsWith('data:')) {
          continue;
        }

        const payload = chunk.slice(5).trim();
        let message;
        try {
          message = JSON.parse(payload);
        } catch {
          continue;
        }

        if (!isFrameMessage(message)) {
          continue;
        }

        frames += 1;
        lastTick = message.tick;
        const now = process.hrtime.bigint();
        if (!firstTickTime) {
          firstTickTime = now;
        }
        lastTickTime = now;

        if (frames >= TARGET_TICKS) {
          break;
        }
      }

      if (frames >= TARGET_TICKS) {
        break;
      }
    }
  } finally {
    streamController.abort();
    await reader.cancel().catch(() => undefined);
  }

  const endTime = lastTickTime ?? process.hrtime.bigint();
  const endMemory = captureMemoryUsage();

  const elapsedNs = endTime - (firstTickTime ?? startTime);
  const elapsedMs = Number(elapsedNs) / 1_000_000;
  const ticksPerSecond = elapsedMs > 0 ? (frames / elapsedMs) * 1000 : null;

  console.log(
    `[benchmark] Captured ${frames} frames in ${elapsedMs.toFixed(2)} ms (~${ticksPerSecond?.toFixed(2) ?? 'N/A'} ticks/sec).`,
  );

  return {
    generatedAt: new Date().toISOString(),
    targetTicks: TARGET_TICKS,
    framesObserved: frames,
    lastTick,
    durationMs: Number.isFinite(elapsedMs) ? Number(elapsedMs.toFixed(4)) : null,
    ticksPerSecond: ticksPerSecond !== null ? Number(ticksPerSecond.toFixed(4)) : null,
    memory: {
      before: startMemory,
      after: endMemory,
      delta: computeMemoryDelta(startMemory, endMemory),
    },
  };
}

function captureMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
  };
}

function computeMemoryDelta(before, after) {
  return Object.fromEntries(
    Object.keys(before).map((key) => {
      const metric = key;
      return [metric, after[metric] - before[metric]];
    }),
  );
}

function isFrameMessage(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.tick === 'number' &&
      value.tick >= 0 &&
      value.entities &&
      typeof value.entities === 'object',
  );
}

async function persistBaseline(rootDir, results) {
  const verificationsDir = path.join(rootDir, 'verifications');
  await fs.mkdir(verificationsDir, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('Z', '');

  const filename = `${timestamp}_benchmark.json`;
  const filePath = path.join(verificationsDir, filename);

  await fs.writeFile(filePath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`[benchmark] Baseline metrics persisted -> ${path.relative(rootDir, filePath)}`);
}

async function fetchJson(method, pathname, body) {
  const response = await fetch(resourceUrl(pathname), applyAuth({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }));

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request failed (${response.status}): ${text}`);
  }

  return response.json();
}

function resourceUrl(pathname) {
  return `http://${HOST}:${PORT}${pathname}`;
}

function applyAuth(init = {}) {
  if (!AUTH_HEADER_VALUE) {
    return init;
  }

  const headersInit = init.headers;
  if (headersInit instanceof Headers) {
    headersInit.set('Authorization', AUTH_HEADER_VALUE);
    return { ...init, headers: headersInit };
  }

  const headers = { ...(headersInit ?? {}), Authorization: AUTH_HEADER_VALUE };
  return { ...init, headers };
}

main().catch((error) => {
  console.error('[benchmark] Failed:', error);
  process.exitCode = 1;
});
