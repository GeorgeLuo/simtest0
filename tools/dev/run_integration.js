#!/usr/bin/env node

/*
 * Sim-Eval integration workflow runner.
 *
 * Steps align with Phase 3 guidance:
 * 1. Start the service programmatically.
 * 2. Probe the API landing page for discoverability metadata.
 * 3. Confirm both simulation and evaluation SSE streams are idle pre-run.
 * 4. Inject the temperature control system (simulation) and range monitor (evaluation).
 * 5. Start the simulation, assert both streams produce data, then exercise pause/stop/eject controls.
 */

const path = require('path');
const { promises: fs } = require('fs');
const { setTimeout: delay } = require('timers/promises');
const { TextDecoder } = require('util');

const RAW_AUTH_TOKEN = process.env.SIMEVAL_AUTH_TOKEN ?? process.env.SIMEVAL_API_TOKEN ?? '';
const AUTH_HEADER_VALUE = RAW_AUTH_TOKEN
  ? RAW_AUTH_TOKEN.startsWith('Bearer ') ? RAW_AUTH_TOKEN : `Bearer ${RAW_AUTH_TOKEN}`
  : null;
const textDecoder = new TextDecoder();

async function main() {
  const rootDir = path.resolve(__dirname, '..', '..');
  const workspaceDir = path.join(rootDir, 'workspaces', 'Describing_Simulation_0');
  const distMainPath = path.join(workspaceDir, 'dist', 'main.js');

  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { start } = require(distMainPath);

  const host = '127.0.0.1';
  const port = 3123;

  console.log('[integration] Starting SimEval server...');
  const server = await start({ port, host, log: (message) => console.log(`[server] ${message}`) });

  let evaluationSystemId;
  let simulationSystemId;
  let stagedMonitorCleanup;
  let stagedMonitorModulePath;
  let stagedSimulationCleanup;
  let stagedSimulationModulePath;

  try {
    await verifyLanding(host, port);
    await verifyIdleStream(host, port, '/api/simulation/stream');
    await verifyIdleStream(host, port, '/api/evaluation/stream');

    const stagedMonitor = await stageEvaluationMonitor(workspaceDir);
    stagedMonitorCleanup = stagedMonitor.cleanup;
    stagedMonitorModulePath = stagedMonitor.modulePath;

    const stagedSimulation = await stageSimulationSystem(workspaceDir);
    stagedSimulationCleanup = stagedSimulation.cleanup;
    stagedSimulationModulePath = stagedSimulation.modulePath;

    evaluationSystemId = await injectTemperatureMonitor(host, port, stagedMonitorModulePath);
    simulationSystemId = await injectTemperatureSystem(host, port, stagedSimulationModulePath);
    const sseSnapshots = await exerciseControls(host, port, {
      simulationSystemId,
      evaluationSystemId,
    });
    await persistArtifacts(rootDir, sseSnapshots);
    console.log('[integration] Workflow completed successfully.');
  } finally {
    console.log('[integration] Shutting down server...');
    await server.stop();
    if (typeof stagedMonitorCleanup === 'function') {
      await stagedMonitorCleanup().catch(() => undefined);
    }
    if (typeof stagedSimulationCleanup === 'function') {
      await stagedSimulationCleanup().catch(() => undefined);
    }
  }
}

async function verifyLanding(host, port) {
  console.log('[integration] Checking API landing metadata...');
  const response = await fetchJson(`http://${host}:${port}/api`);
  if (!Array.isArray(response.segments) || response.segments.length === 0) {
    throw new Error('API landing page missing segments');
  }
  if (!Array.isArray(response.documents) || response.documents.length === 0) {
    throw new Error('API landing page missing documentation references');
  }

  const docPath = response.documents[0]?.path;
  if (typeof docPath !== 'string') {
    throw new Error('Document path missing from metadata response');
  }

  const docResponse = await fetchJson(`http://${host}:${port}${docPath}`);
  if (!docResponse || typeof docResponse.content !== 'string' || docResponse.content.length === 0) {
    throw new Error('Unable to fetch informational document content');
  }
}

async function verifyIdleStream(host, port, path) {
  console.log(`[integration] Verifying ${path} is idle...`);
  const controller = new AbortController();
  const response = await fetch(`http://${host}:${port}${path}`, applyAuth({ signal: controller.signal }));
  if (!response.ok) {
    controller.abort();
    throw new Error(`Unexpected SSE status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    controller.abort();
    throw new Error('SSE response missing readable body');
  }

  const result = await Promise.race([
    reader.read(),
    delay(400).then(() => ({ value: undefined })),
  ]);

  controller.abort();
  await reader.cancel().catch(() => undefined);

  if (result && typeof result === 'object' && result.value && result.value.length > 0) {
    const decoded = textDecoder.decode(result.value);
    const meaningfulLines = decoded
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith(':'));
    if (meaningfulLines.length > 0) {
      throw new Error(`Received SSE payload before start on ${path}`);
    }
  }
}

async function injectTemperatureSystem(host, port, modulePath) {
  console.log('[integration] Injecting temperature control system...');
  if (!modulePath) {
    throw new Error('Missing simulation system module path for injection.');
  }
  const response = await fetchJson(`http://${host}:${port}/api/simulation/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messageId: 'integration-inject',
      system: {
        modulePath,
        exportName: 'createTemperatureControlSystem',
      },
    }),
  });

  if (response.status !== 'success') {
    throw new Error(`System injection failed: ${response.detail ?? 'unknown error'}`);
  }

  if (typeof response.systemId !== 'string' || response.systemId.length === 0) {
    throw new Error('Injection response missing systemId');
  }

  return response.systemId;
}

async function injectTemperatureMonitor(host, port, modulePath) {
  console.log('[integration] Injecting temperature range monitor (evaluation)...');
  const response = await fetchJson(`http://${host}:${port}/api/evaluation/system/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messageId: 'integration-eval-inject',
      system: {
        modulePath,
        exportName: 'createTemperatureRangeMonitor',
      },
    }),
  });

  if (response.status !== 'success') {
    throw new Error(`Evaluation system injection failed: ${response.detail ?? 'unknown error'}`);
  }

  if (typeof response.systemId !== 'string' || response.systemId.length === 0) {
    throw new Error('Evaluation injection response missing systemId');
  }

  return response.systemId;
}

async function exerciseControls(host, port, { simulationSystemId, evaluationSystemId }) {
  console.log('[integration] Exercising simulation control routes...');
  if (!simulationSystemId) {
    throw new Error('Cannot exercise controls without injected simulation systemId');
  }

  let started = false;
  let simulationMessages = [];
  let evaluationMessages = [];

  const startResponse = await fetchJson(`http://${host}:${port}/api/simulation/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId: 'integration-start' }),
  });

  if (startResponse.status !== 'success') {
    throw new Error(`Simulation start failed: ${startResponse.detail ?? 'unknown error'}`);
  }

  started = true;

  try {
    simulationMessages = await collectSseMessages(host, port, '/api/simulation/stream');
    evaluationMessages = await collectSseMessages(host, port, '/api/evaluation/stream');

    assertSimulationStream(simulationMessages);
    assertEvaluationStream(evaluationMessages);
  } finally {
    if (started) {
      for (const action of ['pause', 'stop']) {
        await fetchJson(`http://${host}:${port}/api/simulation/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId: `integration-${action}` }),
        }).catch((error) => {
          console.warn(`[integration] Warning: failed to ${action} simulation`, error.message);
        });
      }
    }

    if (evaluationSystemId) {
      await fetchJson(`http://${host}:${port}/api/evaluation/system/eject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: 'integration-eval-eject', systemId: evaluationSystemId }),
      }).catch((error) => {
        console.warn('[integration] Warning: failed to eject evaluation system', error.message);
      });
    }

    await fetchJson(`http://${host}:${port}/api/simulation/eject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: 'integration-eject', systemId: simulationSystemId }),
    }).catch((error) => {
      console.warn('[integration] Warning: failed to eject simulation system', error.message);
    });
  }

  return { simulationMessages, evaluationMessages };
}

async function collectSseMessages(host, port, path) {
  const url = `http://${host}:${port}${path}`;
  const controller = new AbortController();
  const response = await fetch(url, applyAuth({ signal: controller.signal }));
  if (!response.ok) {
    controller.abort();
    throw new Error(`SSE request failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    controller.abort();
    throw new Error('SSE response missing readable body');
  }

  const decoder = new TextDecoder();
  const messages = [];
  let buffer = '';

  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    while (messages.length < 5) {
      const result = await Promise.race([
        reader.read(),
        delay(1000).then(() => ({ done: false, value: undefined })),
      ]);

      if (!result || result.done) {
        break;
      }

      if (result.value) {
        buffer += decoder.decode(result.value, { stream: true });
      }

      let delimiterIndex;
      while ((delimiterIndex = buffer.indexOf('\n\n')) >= 0) {
        const chunk = buffer.slice(0, delimiterIndex).trim();
        buffer = buffer.slice(delimiterIndex + 2);

        if (chunk.startsWith('data:')) {
          const payload = chunk.slice(5).trim();
          try {
            messages.push(JSON.parse(payload));
          } catch {
            messages.push(payload);
          }
        }
      }
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      throw error;
    }
  } finally {
    clearTimeout(timeout);
    controller.abort();
    await reader.cancel().catch(() => undefined);
  }

  return messages;
}

function assertSimulationStream(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Simulation stream did not emit any frames.');
  }

  const hasTemperature = messages.some((message) => {
    if (!message || typeof message !== 'object' || typeof message.entities !== 'object') {
      return false;
    }

    return Object.values(message.entities).some((components) => {
      if (!components || typeof components !== 'object') {
        return false;
      }
      const temperature = components.temperature;
      return temperature && typeof temperature.value === 'number';
    });
  });

  if (!hasTemperature) {
    throw new Error('Simulation stream lacked temperature component payloads.');
  }
}

function assertEvaluationStream(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Evaluation stream did not emit any frames.');
  }

  const hasMonitor = messages.some((message) => {
    if (!message || typeof message !== 'object' || typeof message.entities !== 'object') {
      return false;
    }

    return Object.values(message.entities).some((components) => {
      if (!components || typeof components !== 'object') {
        return false;
      }
      return Boolean(components['integration.temperature.monitor']);
    });
  });

  if (!hasMonitor) {
    throw new Error('Evaluation stream missing integration temperature monitor component.');
  }
}

async function stageSimulationSystem(workspaceDir) {
  const systemsDir = path.join(workspaceDir, 'plugins', 'simulation', 'systems');
  const moduleFilename = 'integrationTemperatureControlSystem.js';
  const modulePath = path.join(systemsDir, moduleFilename);
  await fs.mkdir(systemsDir, { recursive: true });
  await fs.writeFile(modulePath, generateSimulationSystemSource(), 'utf8');

  const relativeModulePath = path.relative(workspaceDir, modulePath).split(path.sep).join('/');

  return {
    modulePath: relativeModulePath,
    cleanup: async () => {
      await fs.unlink(modulePath);
      try {
        const entries = await fs.readdir(systemsDir);
        if (entries.length === 0) {
          await fs.rmdir(systemsDir);
        }
      } catch {
        /* ignore cleanup errors */
      }
    },
  };
}

async function stageEvaluationMonitor(workspaceDir) {
  const systemsDir = path.join(workspaceDir, 'plugins', 'evaluation', 'systems');
  const moduleFilename = 'integrationTemperatureRangeMonitor.js';
  const modulePath = path.join(systemsDir, moduleFilename);
  await fs.mkdir(systemsDir, { recursive: true });
  await fs.writeFile(modulePath, generateMonitorSource(), 'utf8');

  const relativeModulePath = path.relative(workspaceDir, modulePath).split(path.sep).join('/');

  return {
    modulePath: relativeModulePath,
    cleanup: async () => {
      await fs.unlink(modulePath);
      try {
        const entries = await fs.readdir(systemsDir);
        if (entries.length === 0) {
          await fs.rmdir(systemsDir);
        }
      } catch {
        /* ignore cleanup errors */
      }
    },
  };
}

function generateMonitorSource() {
  return `'use strict';
const { join } = require('path');
const { System } = require(join(__dirname, '../../../dist/core/systems/System'));

const FrameComponent = {
  id: 'evaluation.frame',
  description: 'Snapshot of a simulation frame for evaluation processing.',
  validate(payload) {
    return (
      payload &&
      typeof payload === 'object' &&
      Number.isFinite(payload.tick) &&
      payload.tick >= 0 &&
      payload.entities &&
      typeof payload.entities === 'object'
    );
  },
};

const MonitorComponent = {
  id: 'integration.temperature.monitor',
  description: 'Latest observed temperature with range compliance flag.',
  validate(payload) {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const { tick, temperature, withinRange, message } = payload;
    const temperatureValid = temperature === null || (typeof temperature === 'number' && Number.isFinite(temperature));
    return (
      Number.isFinite(tick) &&
      tick >= 0 &&
      temperatureValid &&
      typeof withinRange === 'boolean' &&
      typeof message === 'string'
    );
  },
};

class TemperatureRangeMonitor extends System {
  constructor(options = {}) {
    super();
    this.entity = null;
    this.lastTick = null;
    this.min = typeof options.min === 'number' ? options.min : 60;
    this.max = typeof options.max === 'number' ? options.max : 85;
  }

  initialize(context) {
    this.entity = context.entityManager.create();
    context.componentManager.addComponent(this.entity, MonitorComponent, {
      tick: 0,
      temperature: null,
      withinRange: false,
      message: 'Awaiting temperature frames.',
    });
  }

  update(context) {
    if (this.entity === null) {
      return;
    }

    const frames = this.collectFrames(context);
    if (frames.length === 0) {
      return;
    }

    const latest = frames[frames.length - 1];
    if (this.lastTick === latest.tick) {
      return;
    }

    const temperature = extractTemperature(latest);
    const withinRange =
      typeof temperature === 'number' ? temperature >= this.min && temperature <= this.max : false;

    const message =
      typeof temperature === 'number'
        ? withinRange
          ? \`Temperature \${temperature.toFixed(1)}°F within range.\`
          : \`Temperature \${temperature.toFixed(1)}°F out of range.\`
        : 'Temperature component unavailable.';

    context.componentManager.addComponent(this.entity, MonitorComponent, {
      tick: latest.tick,
      temperature: typeof temperature === 'number' ? temperature : null,
      withinRange,
      message,
    });
    this.lastTick = latest.tick;
  }

  destroy(context) {
    if (this.entity === null) {
      return;
    }

    context.componentManager.removeAll(this.entity);
    context.entityManager.remove(this.entity);
    this.entity = null;
  }

  collectFrames(context) {
    const entities = context.componentManager.getEntitiesWithComponent(FrameComponent);
    if (!entities || entities.length === 0) {
      return [];
    }

    const frames = [];
    for (const entity of entities) {
      const instance = context.componentManager.getComponent(entity, FrameComponent);
      if (instance) {
        frames.push(instance.payload);
      }
    }

    frames.sort((a, b) => a.tick - b.tick);
    return frames;
  }
}

function extractTemperature(frame) {
  const entities = frame.entities ?? {};
  for (const components of Object.values(entities)) {
    if (components && typeof components === 'object' && components.temperature) {
      const payload = components.temperature;
      if (payload && typeof payload.value === 'number' && Number.isFinite(payload.value)) {
        return payload.value;
      }
    }
  }
  return null;
}

function createTemperatureRangeMonitor(options) {
  return new TemperatureRangeMonitor(options);
}

module.exports = {
  TemperatureRangeMonitor,
  createTemperatureRangeMonitor,
};
`;
}

function generateSimulationSystemSource() {
  return `'use strict';
const { join } = require('path');
const { System } = require(join(__dirname, '../../../dist/core/systems/System'));

const TemperatureComponent = {
  id: 'temperature',
  description: 'Scalar temperature reading in Fahrenheit.',
  validate(payload) {
    return (
      payload &&
      typeof payload === 'object' &&
      typeof payload.value === 'number' &&
      Number.isFinite(payload.value)
    );
  },
};

class TemperatureControlSystem extends System {
  constructor(options = {}) {
    super();
    this.entity = null;
    this.temperature = Number.isFinite(options.start) ? options.start : 72;
    this.delta = Number.isFinite(options.delta) ? options.delta : 0.5;
    this.min = Number.isFinite(options.min) ? options.min : 60;
    this.max = Number.isFinite(options.max) ? options.max : 85;
    this.direction = 1;
  }

  initialize(context) {
    this.entity = context.entityManager.create();
    context.componentManager.addComponent(this.entity, TemperatureComponent, { value: this.temperature });
  }

  update(context) {
    if (this.entity === null) {
      return;
    }

    this.temperature += this.delta * this.direction;
    if (this.temperature >= this.max) {
      this.temperature = this.max;
      this.direction = -1;
    } else if (this.temperature <= this.min) {
      this.temperature = this.min;
      this.direction = 1;
    }

    context.componentManager.addComponent(this.entity, TemperatureComponent, { value: this.temperature });
  }

  destroy(context) {
    if (this.entity === null) {
      return;
    }

    context.componentManager.removeAll(this.entity);
    context.entityManager.remove(this.entity);
    this.entity = null;
  }
}

function createTemperatureControlSystem(options) {
  return new TemperatureControlSystem(options || {});
}

module.exports = {
  TemperatureComponent,
  TemperatureControlSystem,
  createTemperatureControlSystem,
};
`;
}

async function persistArtifacts(rootDir, snapshots) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('Z', '');

  const artifact = {
    generatedAt: new Date().toISOString(),
    simulationMessages: snapshots.simulationMessages,
    evaluationMessages: snapshots.evaluationMessages,
  };

  const directory = path.join(rootDir, 'verifications');
  const filePath = path.join(directory, `${timestamp}_integration.json`);
  await fs.writeFile(filePath, JSON.stringify(artifact, null, 2), 'utf8');
  console.log(`[integration] Captured output -> ${path.relative(rootDir, filePath)}`);
}

async function fetchJson(url, init) {
  const response = await fetch(url, applyAuth(init));
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  return response.json();
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
  console.error('[integration] Failed:', error);
  process.exitCode = 1;
});
