#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { TextDecoder } = require('util');
const { Readable } = require('stream');
const { setTimeout: delay } = require('timers/promises');
const { loadCliConfig, resolveCliConfigPath: resolveCliConfigLocation } = require('./cli_config');

if (typeof fetch !== 'function') {
  console.error('This tool requires Node.js 18+ (fetch API is unavailable).');
  process.exit(1);
}

const argv = process.argv.slice(2);
let CLI_CONFIG = null;
const DEFAULT_CLI_CONFIG_PATH = path.join(os.homedir(), '.simeval', 'config.json');
const DEFAULT_UI_HOST = '127.0.0.1';
const DEFAULT_UI_PORT = 5050;
const DEFAULT_UI_DIRNAME = 'Stream-Metrics-UI';
const DEFAULT_FLEET_LABELS = {
  instance: [
    'simeval.run=${runId}',
    'simeval.deployment=${deployment}',
    'simeval.instance=${instance}',
  ],
  snapshot: [
    'name=simeval-${deployment}-${instance}-${runId}',
    'simeval.run=${runId}',
    'simeval.deployment=${deployment}',
    'simeval.instance=${instance}',
  ],
};
const DEFAULT_FLEET_CLEANUP = {
  snapshot: true,
  stop: true,
  stopOnFailure: true,
  forget: false,
};

if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
  printUsage();
  process.exit(0);
}

main().catch((error) => {
  console.error(`[simeval-cli] ${error.message ?? error}`);
  process.exit(1);
});

async function main() {
  const [command, ...rest] = argv;
  const allowMissingCliConfig = command === 'config';
  CLI_CONFIG = loadCliConfig({
    argv,
    defaultPath: DEFAULT_CLI_CONFIG_PATH,
    allowMissing: allowMissingCliConfig,
  });
  if (!process.env.MORPH_API_KEY && CLI_CONFIG?.data?.morphApiKey) {
    process.env.MORPH_API_KEY = CLI_CONFIG.data.morphApiKey;
  }

  switch (command) {
    case 'health':
      return handleHealth(rest);
    case 'status':
      return handleStatus(rest);
    case 'start':
    case 'pause':
    case 'stop':
      return handlePlayback(command, rest);
    case 'system':
      return handleSystem(rest);
    case 'component':
      return handleComponent(rest);
    case 'plugin':
      return handlePlugin(rest);
    case 'stream':
      return handleStream(rest);
    case 'ui':
      return handleUi(rest);
    case 'config':
      return handleConfig(rest);
    case 'run':
      return handleRun(rest);
    case 'wait':
      return handleWait(rest);
    case 'deploy':
      return handleDeploy(rest);
    case 'morphcloud':
      return handleMorphcloud(rest);
    case 'fleet':
      return handleFleet(rest);
    case 'log':
      return handleLog(rest);
    case 'codebase':
      return handleCodebase(rest);
    default:
      printUsage(`Unknown command: ${command}`);
      return undefined;
  }
}

async function handleHealth(argvRest) {
  const { options } = parseArgs(argvRest);
  if (options.help) {
    printUsage('health');
    return;
  }

  const server = resolveServerUrl(options);
  const authHeader = resolveAuthHeader(options);
  const url = buildUrl(server, '/health');
  const response = await requestJson(url, { method: 'GET' }, authHeader);
  printJson(response);
}

async function handleStatus(argvRest) {
  const { options } = parseArgs(argvRest);
  if (options.help) {
    printUsage('status');
    return;
  }

  if ((options.prune || options['prune-morph'] || options['stop-morph']) && !options.all) {
    throw new Error('Use --all with --prune or --prune-morph.');
  }

  if (options.all) {
    await handleStatusAll(options);
    return;
  }

  const server = resolveServerUrl(options);
  const authHeader = resolveAuthHeader(options);
  const url = buildUrl(server, '/status');
  const response = await requestJson(url, { method: 'GET' }, authHeader);
  printJson(response);
}

async function handleStatusAll(options) {
  const timeoutMs = parseOptionalNumber(options.timeout, 'timeout') ?? 5000;
  const checkedAt = new Date().toISOString();
  const pruneLocal = Boolean(options.prune);
  const pruneMorph = Boolean(options['prune-morph'] || options['stop-morph']);
  const stopMorph = Boolean(options['stop-morph']);
  const signal = typeof options.signal === 'string' ? options.signal : 'SIGTERM';

  const deployStateFile = resolveDeployStateFile(options);
  const deployState = loadDeployState(deployStateFile);
  const localDeployments = await Promise.all(
    Object.entries(deployState.deployments).map(([key, record]) =>
      checkLocalDeployment(record, timeoutMs, key),
    ),
  );

  const uiStateFile = resolveUiStateFile(options);
  const uiState = loadUiState(uiStateFile);
  const uiDeployments = await Promise.all(
    Object.entries(uiState.deployments).map(([key, record]) =>
      checkUiDeployment(record, timeoutMs, key),
    ),
  );

  const morphStateFile = resolveMorphcloudStateFile(options);
  const morphState = loadMorphcloudState(morphStateFile);
  const morphInstances = await Promise.all(
    Object.entries(morphState.instances).map(([key, record]) =>
      checkMorphcloudInstance(record, timeoutMs, key),
    ),
  );

  const pruneResults = {
    local: pruneLocal
      ? await pruneLocalDeployments({
          stateFile: deployStateFile,
          state: deployState,
          deployments: localDeployments,
          timeoutMs,
          signal,
        })
      : null,
    morphcloud: pruneMorph
      ? await pruneMorphcloudInstances({
          stateFile: morphStateFile,
          state: morphState,
          instances: morphInstances,
          stopRemote: stopMorph,
        })
      : null,
  };

  const summaryStatus = summarizeAggregateStatus({ localDeployments, morphInstances, uiDeployments });

  const payload = {
    status: summaryStatus,
    checkedAt,
    local: {
      stateFile: deployStateFile,
      updatedAt: deployState.updatedAt ?? null,
      deployments: localDeployments,
    },
    morphcloud: {
      stateFile: morphStateFile,
      updatedAt: morphState.updatedAt ?? null,
      instances: morphInstances,
    },
    prune: pruneLocal || pruneMorph ? pruneResults : null,
  };

  if (uiDeployments.length > 0) {
    payload.ui = {
      stateFile: uiStateFile,
      updatedAt: uiState.updatedAt ?? null,
      deployments: uiDeployments,
    };
  }

  printJson(payload);
}

function summarizeUiStatus(ui) {
  if (!ui || !ui.url) {
    return 'unconfigured';
  }
  if (!ui.running) {
    return 'down';
  }
  if (!ui.isUi) {
    return 'not-ui';
  }
  return 'running';
}

async function checkLocalDeployment(record, timeoutMs, key) {
  const host = record?.host ?? null;
  const port = record?.port ?? null;
  const pid = Number(record?.pid);
  const processAlive = isProcessAlive(pid);
  const server = host && port ? resolveDeployHealthHost(host, port) : null;
  const checks = server
    ? await checkServerEndpoints(server, null, timeoutMs)
    : {
        health: { ok: false, status: null, error: 'Missing host/port for deployment.' },
        status: { ok: false, status: null, error: 'Missing host/port for deployment.' },
      };
  let overall = 'unknown';
  if (!processAlive) {
    overall = checks.health.ok ? 'mismatch' : 'stopped';
  } else if (!checks.health.ok) {
    overall = 'unhealthy';
  } else {
    overall = 'healthy';
  }
  return {
    ...record,
    key: key ?? null,
    processAlive,
    server,
    health: checks.health,
    status: checks.status,
    overall,
  };
}

async function checkUiDeployment(record, timeoutMs, key) {
  const host = record?.host ?? null;
  const port = record?.port ?? null;
  const url = record?.url ?? (host && port ? `http://${host}:${port}` : null);
  const pid = Number(record?.pid);
  const processAlive = Number.isFinite(pid) ? isProcessAlive(pid) : null;
  const probe = url
    ? await probeUiHttpUrl(url, timeoutMs)
    : { running: false, isUi: false, url: null, error: 'Missing UI url.' };

  let overall = 'unknown';
  if (!url) {
    overall = 'unknown';
  } else if (probe.running && probe.isUi) {
    if (processAlive === false) {
      overall = 'mismatch';
    } else {
      overall = 'running';
    }
  } else if (probe.running && !probe.isUi) {
    overall = 'not-ui';
  } else if (!probe.running) {
    overall = processAlive ? 'unhealthy' : 'stopped';
  }

  return {
    ...record,
    key: key ?? null,
    url,
    processAlive,
    probe: {
      running: probe.running,
      isUi: probe.isUi,
      error: probe.error ?? null,
    },
    overall,
  };
}

async function checkMorphcloudInstance(record, timeoutMs, key) {
  const apiUrl = resolveMorphcloudApiUrl(record);
  const authHeader = buildAuthHeader(record?.authToken);
  const checks = apiUrl
    ? await checkServerEndpoints(apiUrl, authHeader, timeoutMs)
    : {
        health: { ok: false, status: null, error: 'Missing apiUrl for instance.' },
        status: { ok: false, status: null, error: 'Missing apiUrl for instance.' },
      };
  const stoppedAt = record?.stoppedAt ?? null;
  const overall = stoppedAt
    ? 'stopped'
    : apiUrl && checks.health.ok
      ? 'healthy'
      : apiUrl
        ? 'unhealthy'
        : 'unknown';
  return {
    id: record?.id ?? null,
    key: key ?? null,
    name: record?.name ?? null,
    snapshot: record?.snapshot ?? null,
    apiUrl,
    auth: Boolean(record?.authToken),
    publicUrl: record?.publicUrl ?? null,
    internalIp: record?.internalIp ?? null,
    port: record?.port ?? null,
    createdAt: record?.createdAt ?? null,
    stoppedAt,
    health: checks.health,
    status: checks.status,
    overall,
  };
}

async function pruneLocalDeployments({ stateFile, state, deployments, timeoutMs, signal }) {
  const prunable = new Set(['unhealthy', 'stopped', 'mismatch', 'unknown']);
  const removed = [];
  const kept = [];
  const failed = [];

  for (const deployment of deployments) {
    const key = deployment.key ?? (deployment.port !== undefined ? String(deployment.port) : null);
    if (!key) {
      failed.push({
        id: null,
        overall: deployment.overall,
        error: 'Missing deployment key.',
      });
      continue;
    }

    if (!prunable.has(deployment.overall)) {
      kept.push({ key, overall: deployment.overall });
      continue;
    }

    let stopResult = null;
    let error = null;
    let aliveAfter = deployment.processAlive;

    if (deployment.processAlive) {
      try {
        stopResult = await stopDeployment(deployment, signal, timeoutMs);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
      aliveAfter = isProcessAlive(Number(deployment.pid));
    }

    if (!aliveAfter) {
      delete state.deployments[key];
      removed.push({
        key,
        overall: deployment.overall,
        stop: stopResult,
      });
    } else {
      failed.push({
        key,
        overall: deployment.overall,
        error: error || 'Process still running after stop attempt.',
        stop: stopResult,
      });
      kept.push({ key, overall: deployment.overall });
    }
  }

  if (removed.length > 0) {
    saveDeployState(stateFile, state);
  }

  return {
    stateFile,
    removed,
    kept,
    failed,
  };
}

async function pruneMorphcloudInstances({ stateFile, state, instances, stopRemote }) {
  const prunable = new Set(['unhealthy', 'stopped', 'unknown']);
  const removed = [];
  const kept = [];
  const failed = [];

  for (const instance of instances) {
    const key = instance.key ?? instance.id ?? null;
    if (!key) {
      failed.push({
        id: null,
        overall: instance.overall,
        error: 'Missing instance id.',
      });
      continue;
    }

    if (!prunable.has(instance.overall)) {
      kept.push({ id: key, overall: instance.overall });
      continue;
    }

    let stopResult = null;
    if (stopRemote && instance.overall !== 'stopped') {
      stopResult = await stopMorphcloudInstance(key);
      if (!stopResult.ok) {
        failed.push({
          id: key,
          overall: instance.overall,
          error: stopResult.error || 'Failed to stop instance.',
          stop: stopResult,
        });
        kept.push({ id: key, overall: instance.overall });
        continue;
      }
    }

    delete state.instances[key];
    removed.push({
      id: key,
      overall: instance.overall,
      stop: stopResult,
    });
  }

  if (removed.length > 0) {
    saveMorphcloudState(stateFile, state);
  }

  return {
    stateFile,
    removed,
    kept,
    failed,
  };
}

async function stopMorphcloudInstance(id) {
  if (!id) {
    return { ok: false, error: 'Missing instance id.' };
  }
  if (!process.env.MORPH_API_KEY) {
    return { ok: false, error: 'MORPH_API_KEY is not set.' };
  }
  try {
    const result = await runCommandCapture('morphcloud', ['instance', 'stop', id], {
      prefix: `[morphcloud:${id}] `,
    });
    return {
      ok: result.code === 0,
      code: result.code,
      error: result.code === 0 ? null : result.stderr || result.stdout || 'Stop failed.',
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function resolveMorphcloudApiUrl(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }
  if (record.apiUrl) {
    return record.apiUrl;
  }
  if (record.publicUrl) {
    return `${String(record.publicUrl).replace(/\/+$/, '')}/api`;
  }
  if (record.internalIp && record.port) {
    return `http://${record.internalIp}:${record.port}/api`;
  }
  return null;
}

async function checkServerEndpoints(server, authHeader, timeoutMs) {
  const healthResult = await safeRequestJson(buildUrl(server, '/health'), authHeader, timeoutMs);
  const health = summarizeHealthResult(healthResult);
  if (!healthResult.ok) {
    return {
      health,
      status: { ok: false, status: null, error: 'Skipped status check (health failed).' },
    };
  }
  const statusResult = await safeRequestJson(buildUrl(server, '/status'), authHeader, timeoutMs);
  return {
    health,
    status: summarizeStatusResult(statusResult),
  };
}

function summarizeHealthResult(result) {
  return {
    ok: result.ok,
    status: result.status ?? null,
    error: result.ok ? null : result.error ?? 'Request failed.',
  };
}

function summarizeStatusResult(result) {
  if (!result.ok) {
    return {
      ok: false,
      status: result.status ?? null,
      error: result.error ?? 'Request failed.',
    };
  }
  const payload = result.data ?? {};
  return {
    ok: true,
    status: result.status ?? null,
    simulation: payload?.simulation?.state ?? null,
    evaluation: payload?.evaluation?.state ?? null,
  };
}

function summarizeAggregateStatus({ localDeployments, morphInstances, uiDeployments }) {
  const entries = [];
  localDeployments.forEach((deployment) => entries.push(deployment.overall));
  morphInstances.forEach((instance) => entries.push(instance.overall));
  if (Array.isArray(uiDeployments) && uiDeployments.length > 0) {
    uiDeployments.forEach((deployment) => entries.push(deployment.overall));
  }

  if (entries.length === 0) {
    return 'empty';
  }

  const okStates = new Set(['healthy', 'running']);
  const badStates = new Set(['unhealthy', 'stopped', 'unknown', 'mismatch', 'down', 'not-ui']);

  const hasOk = entries.some((value) => okStates.has(value));
  const hasBad = entries.some((value) => badStates.has(value));

  if (hasBad && hasOk) {
    return 'partial';
  }
  if (hasBad && !hasOk) {
    return 'failed';
  }
  return 'ok';
}

async function handlePlayback(action, argvRest) {
  const { options } = parseArgs(argvRest);
  if (options.help) {
    printUsage(action);
    return;
  }

  const runContext = resolveRunContext(options);
  const server = resolveServerUrl(options, runContext);
  const authHeader = resolveAuthHeader(options);
  const messageId = options['message-id'] ?? buildMessageId(runContext?.id, action);
  const url = buildUrl(server, `/simulation/${action}`);
  const payload = messageId ? { messageId } : undefined;
  const response = await requestJson(
    url,
    payload
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      : { method: 'POST' },
    authHeader,
  );
  printJson(response);
  if (runContext) {
    recordRunEvent(runContext, {
      type: 'playback',
      action,
      messageId: payload?.messageId ?? null,
      response,
    });
  }
}

async function handleSystem(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('system');
    return;
  }

  const player = normalizePlayer(options.player);
  const runContext = resolveRunContext(options);
  const server = resolveServerUrl(options, runContext);
  const authHeader = resolveAuthHeader(options);

  if (subcommand === 'inject') {
    const modulePath = options.module;
    if (!modulePath) {
      throw new Error('Missing --module for system injection.');
    }
    const exportName = options.export;
    const messageId = options['message-id'] ?? buildMessageId(runContext?.id, `${player}-inject`);
    const payload = {
      messageId,
      system: {
        modulePath,
        exportName: exportName || undefined,
      },
    };
    const url = buildUrl(server, `/${player}/system`);
    const response = await requestJson(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      authHeader,
    );
    printJson(response);
    if (runContext) {
      recordRunEvent(runContext, {
        type: 'system-inject',
        player,
        modulePath,
        exportName: exportName || null,
        messageId,
        response,
      });
    }
    return;
  }

  if (subcommand === 'eject') {
    const systemId = options['system-id'];
    if (!systemId) {
      throw new Error('Missing --system-id for system ejection.');
    }
    const url = buildUrl(server, `/${player}/system/${systemId}`);
    const response = await requestJson(url, { method: 'DELETE' }, authHeader);
    printJson(response);
    if (runContext) {
      recordRunEvent(runContext, {
        type: 'system-eject',
        player,
        systemId,
        response,
      });
    }
    return;
  }

  throw new Error(`Unknown system subcommand: ${subcommand}`);
}

async function handleComponent(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('component');
    return;
  }

  const player = normalizePlayer(options.player);
  const runContext = resolveRunContext(options);
  const server = resolveServerUrl(options, runContext);
  const authHeader = resolveAuthHeader(options);

  if (subcommand === 'inject') {
    const modulePath = options.module;
    if (!modulePath) {
      throw new Error('Missing --module for component injection.');
    }
    const exportName = options.export;
    const messageId = options['message-id'] ?? buildMessageId(runContext?.id, `${player}-component-inject`);
    const payload = {
      messageId,
      component: {
        modulePath,
        exportName: exportName || undefined,
      },
    };
    const url = buildUrl(server, `/${player}/component`);
    const response = await requestJson(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      authHeader,
    );
    printJson(response);
    if (runContext) {
      recordRunEvent(runContext, {
        type: 'component-inject',
        player,
        modulePath,
        exportName: exportName || null,
        messageId,
        response,
      });
    }
    return;
  }

  if (subcommand === 'eject') {
    const componentId = options['component-id'];
    if (!componentId) {
      throw new Error('Missing --component-id for component ejection.');
    }
    const url = buildUrl(server, `/${player}/component/${componentId}`);
    const response = await requestJson(url, { method: 'DELETE' }, authHeader);
    printJson(response);
    if (runContext) {
      recordRunEvent(runContext, {
        type: 'component-eject',
        player,
        componentId,
        response,
      });
    }
    return;
  }

  throw new Error(`Unknown component subcommand: ${subcommand}`);
}

async function handlePlugin(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('plugin');
    return;
  }

  if (subcommand !== 'upload') {
    throw new Error(`Unknown plugin subcommand: ${subcommand}`);
  }

  const sourcePath = options.source;
  if (!sourcePath) {
    throw new Error('Missing --source for plugin upload.');
  }

  const resolvedSource = path.resolve(process.cwd(), sourcePath);
  const content = fs.readFileSync(resolvedSource, 'utf8');
  const inferredPath = inferPluginPath(resolvedSource);
  const targetPath = options.dest || inferredPath;
  if (!targetPath) {
    throw new Error('Missing --dest and unable to infer plugin path under plugins/.');
  }
  if (!targetPath.startsWith('plugins/')) {
    throw new Error('Plugin destination must start with plugins/.');
  }

  const runContext = resolveRunContext(options);
  const server = resolveServerUrl(options, runContext);
  const authHeader = resolveAuthHeader(options);
  const messageId = options['message-id'] ?? buildMessageId(runContext?.id, 'plugin-upload');

  const payload = {
    messageId,
    path: targetPath,
    content,
    overwrite: Boolean(options.overwrite),
  };

  const url = buildUrl(server, '/codebase/plugin');
  const response = await requestJson(
    url,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    authHeader,
  );
  printJson(response);
  if (runContext) {
    recordRunEvent(runContext, {
      type: 'plugin-upload',
      source: resolvedSource,
      path: targetPath,
      overwrite: Boolean(options.overwrite),
      messageId,
      response,
    });
  }
}

async function handleStream(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('stream');
    return;
  }

  const runContext = resolveRunContext(options);
  const server = resolveServerUrl(options, runContext);
  const authHeader = resolveAuthHeader(options);

  const streamInput = options.stream || 'simulation';
  const streamPath = resolveStreamPath(streamInput);
  const url = streamPath.startsWith('http://') || streamPath.startsWith('https://')
    ? streamPath
    : buildUrl(server, streamPath);

  if (subcommand === 'capture') {
    const format = (options.format || 'jsonl').toLowerCase();
    if (format !== 'jsonl' && format !== 'json') {
      throw new Error('Invalid --format value. Expected jsonl or json.');
    }

    const maxFrames = parseOptionalNumber(options.frames, 'frames');
    const durationMs = parseOptionalNumber(options.duration, 'duration');
    if (!maxFrames && !durationMs) {
      throw new Error('Provide --frames or --duration to bound the capture.');
    }

    const componentId = options.component || '';
    const entityId = options.entity || '';
    const includeAcks = Boolean(options['include-acks']);

    const outputPath = resolveCapturePath(options.out, runContext, streamInput, format);
    const summary = await captureStream({
      url,
      outputPath,
      format,
      maxFrames,
      durationMs,
      componentId,
      entityId,
      includeAcks,
      authHeader,
    });

    console.log(`[capture] ${summary.recordCount} records saved to ${summary.outputPath}`);
    if (runContext) {
      recordRunCapture(runContext, {
        type: 'capture',
        stream: streamInput,
        format,
        outputPath: summary.outputPath,
        recordCount: summary.recordCount,
        frameCount: summary.frameCount,
        ackCount: summary.ackCount,
        durationMs: summary.durationMs,
        componentId: componentId || null,
        entityId: entityId || null,
        includeAcks,
      });
    }
    return;
  }

  if (subcommand === 'forward') {
    const uiInput = resolveUiInput(options, 'stream forward');
    if (!uiInput) {
      throw new Error('Provide --ui to forward stream data to the metrics UI.');
    }
    const uiUrl = await resolveUiWsUrl(uiInput);
    if (!uiUrl) {
      throw new Error('Invalid --ui value. Provide a ws:// or http(s):// URL.');
    }

    const foreground = parseBooleanOption(options.foreground, false) ||
      parseBooleanOption(options['no-background'], false);
    if (!foreground) {
      const logFile = resolveCliLogFile(options, 'stream_forward');
      const args = buildStreamForwardArgs({
        options,
        streamInput,
        uiUrl,
      });
      const pid = spawnDetachedProcess({
        command: process.execPath,
        args,
        cwd: process.cwd(),
        env: process.env,
        logFile,
      });
      printJson({
        status: 'started',
        pid,
        logFile,
        uiUrl,
        stream: streamInput,
      });
      return;
    }

    const maxFrames = parseOptionalNumber(options.frames, 'frames');
    const durationMs = parseOptionalNumber(options.duration, 'duration');
    const componentId = options.component || '';
    const entityId = options.entity || '';
    const captureId = options['capture-id'] || buildCaptureId();
    const filename =
      options.name ||
      options.filename ||
      `${String(streamInput || 'stream').replace(/[^a-z0-9_-]+/gi, '_')}.jsonl`;

    const summary = await forwardStream({
      url,
      uiUrl,
      maxFrames,
      durationMs,
      componentId,
      entityId,
      authHeader,
      captureId,
      filename,
    });

    console.log(
      `[forward] ${summary.frameCount} frames sent to ${summary.uiUrl} as ${summary.captureId}`,
    );
    if (runContext) {
      recordRunCapture(runContext, {
        type: 'forward',
        stream: streamInput,
        uiUrl: summary.uiUrl,
        captureId: summary.captureId,
        frameCount: summary.frameCount,
        durationMs: summary.durationMs,
        componentId: componentId || null,
        entityId: entityId || null,
      });
    }
    return;
  }

  if (subcommand === 'upload') {
    const fileInput = options.file || options.source;
    if (!fileInput) {
      throw new Error('Provide --file to upload a capture to the metrics UI.');
    }
    const uiInput = resolveUiInput(options, 'stream upload');
    if (!uiInput) {
      throw new Error('Provide --ui to upload a capture to the metrics UI.');
    }

    const resolvedFile = path.resolve(process.cwd(), String(fileInput));
    if (!fs.existsSync(resolvedFile)) {
      throw new Error(`Capture file not found: ${resolvedFile}`);
    }

    const maxFrames = parseOptionalNumber(options.frames, 'frames');
    const componentId = options.component || '';
    const entityId = options.entity || '';
    const filename = options.name || options.filename || path.basename(resolvedFile);
    if (maxFrames || componentId || entityId) {
      throw new Error('stream upload does not support --frames/--component/--entity.');
    }
    if (options['capture-id']) {
      throw new Error('stream upload does not support --capture-id.');
    }

    const uiHttpUrl = normalizeUiHttpUrl(uiInput);
    if (!uiHttpUrl) {
      throw new Error('Invalid --ui value. Provide a http(s):// URL for uploads.');
    }

    const summary = await uploadCaptureFileHttp({
      uiUrl: uiHttpUrl,
      filename,
      filePath: resolvedFile,
    });

    console.log(
      `[upload] ${summary.filename} registered at ${summary.uiUrl} as ${summary.captureId}`,
    );
    if (runContext) {
      recordRunCapture(runContext, {
        type: 'upload',
        filePath: resolvedFile,
        uiUrl: summary.uiUrl,
        captureId: summary.captureId,
        filename: summary.filename,
        size: summary.size ?? null,
      });
    }
    return;
  }

  throw new Error(`Unknown stream subcommand: ${subcommand}`);
}

async function handleUi(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('ui');
    return;
  }

  if (subcommand === 'serve') {
    await handleUiServe(options);
    return;
  }

  if (subcommand === 'shutdown') {
    await handleUiShutdown(options);
    return;
  }

  const uiInput = resolveUiInput(options, 'ui');
  if (!uiInput) {
    throw new Error('Provide --ui to connect to the metrics UI.');
  }

  if (subcommand === 'live-status') {
    const uiHttpUrl = normalizeUiHttpUrl(uiInput);
    if (!uiHttpUrl) {
      throw new Error('Invalid --ui value. Provide a http(s):// URL for live-status.');
    }
    const url = buildUrl(uiHttpUrl, '/api/live/status');
    const response = await requestJson(url, { method: 'GET' });
    printJson(response);
    return;
  }

  const uiUrl = await resolveUiWsUrl(uiInput);
  if (!uiUrl) {
    throw new Error('Invalid --ui value. Provide a ws:// or http(s):// URL.');
  }

  const socket = await connectWebSocket(uiUrl);
  let socketClosed = false;
  socket.addEventListener('close', () => {
    socketClosed = true;
  });

  sendWsMessage(socket, { type: 'register', role: 'agent' });
  const registered = await waitForWsAck(socket);
  if (!registered) {
    socket.close();
    throw new Error('Failed to register with the UI WebSocket.');
  }

  const timeoutMs = parseOptionalNumber(options.timeout, 'timeout') ?? 5000;
  const requestId = buildMessageId(null, `ui-${subcommand}`);

  try {
    if (subcommand === 'mode') {
      const mode = String(options.mode || '').toLowerCase();
      if (mode !== 'file' && mode !== 'live') {
        throw new Error('Provide --mode file|live for ui mode.');
      }
      sendWsMessage(socket, { type: 'set_source_mode', mode, request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('mode', uiUrl, requestId, { mode });
      return;
    }

    if (subcommand === 'live-source') {
      const source = options.source || options.file || options.endpoint;
      if (!source) {
        throw new Error('Provide --source for ui live-source.');
      }
      const captureId = options['capture-id'];
      sendWsMessage(socket, {
        type: 'set_live_source',
        source: String(source),
        captureId: captureId ? String(captureId) : undefined,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('live-source', uiUrl, requestId, {
        source: String(source),
        captureId: captureId ? String(captureId) : undefined,
      });
      return;
    }

    if (subcommand === 'live-start') {
      const source = options.source || options.file || options.endpoint;
      if (!source) {
        throw new Error('Provide --source for ui live-start.');
      }
      const pollIntervalMs = parseOptionalNumber(options['poll-ms'] ?? options.poll, 'poll-ms');
      const pollSeconds = parseOptionalNumber(options['poll-seconds'], 'poll-seconds');
      const captureId = options['capture-id'];
      const filename = options.filename || options.name;
      sendWsMessage(socket, {
        type: 'live_start',
        source: String(source),
        pollIntervalMs: pollIntervalMs ?? (pollSeconds ? Math.round(pollSeconds * 1000) : undefined),
        captureId: captureId ? String(captureId) : undefined,
        filename: filename ? String(filename) : undefined,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs: timeoutMs + 2000,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('live-start', uiUrl, requestId, {
        source: String(source),
        captureId: captureId ? String(captureId) : undefined,
        filename: filename ? String(filename) : undefined,
        pollIntervalMs: pollIntervalMs ?? (pollSeconds ? Math.round(pollSeconds * 1000) : undefined),
      });
      return;
    }

    if (subcommand === 'live-stop') {
      const captureId = options['capture-id'];
      sendWsMessage(socket, {
        type: 'live_stop',
        captureId: captureId ? String(captureId) : undefined,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('live-stop', uiUrl, requestId, {
        captureId: captureId ? String(captureId) : undefined,
      });
      return;
    }

    if (subcommand === 'select') {
      const captureId = options['capture-id'];
      if (!captureId) {
        throw new Error('Provide --capture-id for ui select.');
      }
      const path = parsePathInput(options.path ?? options['path-json']);
      if (!path || path.length === 0) {
        throw new Error('Provide --path (JSON array recommended) for ui select.');
      }
      sendWsMessage(socket, {
        type: 'select_metric',
        captureId: String(captureId),
        path,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('select', uiUrl, requestId, {
        captureId: String(captureId),
        path,
      });
      return;
    }

    if (subcommand === 'analysis-select') {
      const captureId = options['capture-id'];
      if (!captureId) {
        throw new Error('Provide --capture-id for ui analysis-select.');
      }
      const path = parsePathInput(options.path ?? options['path-json']);
      if (!path || path.length === 0) {
        throw new Error('Provide --path (JSON array recommended) for ui analysis-select.');
      }
      sendWsMessage(socket, {
        type: 'select_analysis_metric',
        captureId: String(captureId),
        path,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('analysis-select', uiUrl, requestId, {
        captureId: String(captureId),
        path,
      });
      return;
    }

    if (subcommand === 'remove-capture') {
      const captureId = options['capture-id'];
      if (!captureId) {
        throw new Error('Provide --capture-id for ui remove-capture.');
      }
      sendWsMessage(socket, {
        type: 'remove_capture',
        captureId: String(captureId),
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('remove-capture', uiUrl, requestId, {
        captureId: String(captureId),
      });
      return;
    }

    if (subcommand === 'deselect') {
      const captureId = options['capture-id'];
      const fullPath = options['full-path'] || options.fullPath;
      if (!captureId || !fullPath) {
        throw new Error('Provide --capture-id and --full-path for ui deselect.');
      }
      sendWsMessage(socket, {
        type: 'deselect_metric',
        captureId: String(captureId),
        fullPath: String(fullPath),
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('deselect', uiUrl, requestId, {
        captureId: String(captureId),
        fullPath: String(fullPath),
      });
      return;
    }

    if (subcommand === 'analysis-deselect') {
      const captureId = options['capture-id'];
      const path = parsePathInput(options.path ?? options['path-json']);
      const fullPath = options['full-path'] || options.fullPath || (path ? path.join('.') : null);
      if (!captureId || !fullPath) {
        throw new Error('Provide --capture-id and --full-path (or --path) for ui analysis-deselect.');
      }
      sendWsMessage(socket, {
        type: 'deselect_analysis_metric',
        captureId: String(captureId),
        fullPath: String(fullPath),
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('analysis-deselect', uiUrl, requestId, {
        captureId: String(captureId),
        fullPath: String(fullPath),
      });
      return;
    }

    if (subcommand === 'clear') {
      sendWsMessage(socket, { type: 'clear_selection', request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('clear', uiUrl, requestId);
      return;
    }

    if (subcommand === 'analysis-clear') {
      sendWsMessage(socket, { type: 'clear_analysis_metrics', request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('analysis-clear', uiUrl, requestId);
      return;
    }

    if (subcommand === 'derivation-group-create') {
      const groupId = options['group-id'] || options.groupId || options.id;
      const name = options.name;
      sendWsMessage(socket, {
        type: 'create_derivation_group',
        groupId: groupId ? String(groupId) : undefined,
        name: name ? String(name) : undefined,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('derivation-group-create', uiUrl, requestId, {
        groupId: groupId ? String(groupId) : undefined,
        name: name ? String(name) : undefined,
      });
      return;
    }

    if (subcommand === 'derivation-group-delete') {
      const groupId = options['group-id'] || options.groupId || options.id;
      if (!groupId) {
        throw new Error('Provide --group-id for ui derivation-group-delete.');
      }
      sendWsMessage(socket, {
        type: 'delete_derivation_group',
        groupId: String(groupId),
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('derivation-group-delete', uiUrl, requestId, { groupId: String(groupId) });
      return;
    }

    if (subcommand === 'derivation-group-active') {
      const groupId = options['group-id'] || options.groupId || options.id;
      if (!groupId) {
        throw new Error('Provide --group-id for ui derivation-group-active.');
      }
      sendWsMessage(socket, {
        type: 'set_active_derivation_group',
        groupId: String(groupId),
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('derivation-group-active', uiUrl, requestId, { groupId: String(groupId) });
      return;
    }

    if (subcommand === 'derivation-group-update') {
      const groupId = options['group-id'] || options.groupId || options.id;
      if (!groupId) {
        throw new Error('Provide --group-id for ui derivation-group-update.');
      }
      const newGroupId = options['new-group-id'] || options.newGroupId || options['new-id'];
      const name = options.name;
      if (!newGroupId && !name) {
        throw new Error('Provide --new-group-id and/or --name for ui derivation-group-update.');
      }
      sendWsMessage(socket, {
        type: 'update_derivation_group',
        groupId: String(groupId),
        newGroupId: newGroupId ? String(newGroupId) : undefined,
        name: name ? String(name) : undefined,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('derivation-group-update', uiUrl, requestId, {
        groupId: String(groupId),
        newGroupId: newGroupId ? String(newGroupId) : undefined,
        name: name ? String(name) : undefined,
      });
      return;
    }

    if (subcommand === 'clear-captures') {
      sendWsMessage(socket, { type: 'clear_captures', request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('clear-captures', uiUrl, requestId);
      return;
    }

    if (subcommand === 'play' || subcommand === 'pause' || subcommand === 'stop') {
      sendWsMessage(socket, { type: subcommand, request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess(subcommand, uiUrl, requestId);
      return;
    }

    if (subcommand === 'seek') {
      const tick = Number(options.tick);
      if (!Number.isFinite(tick)) {
        throw new Error('Provide --tick for ui seek.');
      }
      sendWsMessage(socket, { type: 'seek', tick, request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('seek', uiUrl, requestId, { tick });
      return;
    }

    if (subcommand === 'speed') {
      const speed = Number(options.speed);
      if (!Number.isFinite(speed) || speed <= 0) {
        throw new Error('Provide --speed for ui speed.');
      }
      sendWsMessage(socket, { type: 'set_speed', speed, request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('speed', uiUrl, requestId, { speed });
      return;
    }

    if (subcommand === 'window-size') {
      const windowSize = parseOptionalNumber(options['window-size'] ?? options.size, 'window-size');
      if (!Number.isFinite(windowSize) || windowSize <= 0) {
        throw new Error('Provide --window-size for ui window-size.');
      }
      sendWsMessage(socket, {
        type: 'set_window_size',
        windowSize,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'window-start') {
      const windowStart = parseOptionalNumber(options['window-start'], 'window-start');
      if (!Number.isFinite(windowStart) || windowStart <= 0) {
        throw new Error('Provide --window-start for ui window-start.');
      }
      sendWsMessage(socket, {
        type: 'set_window_start',
        windowStart,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'window-end') {
      const windowEnd = parseOptionalNumber(options['window-end'], 'window-end');
      if (!Number.isFinite(windowEnd) || windowEnd <= 0) {
        throw new Error('Provide --window-end for ui window-end.');
      }
      sendWsMessage(socket, {
        type: 'set_window_end',
        windowEnd,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'window-range') {
      const windowStart = parseOptionalNumber(options['window-start'], 'window-start');
      const windowEnd = parseOptionalNumber(options['window-end'], 'window-end');
      if (!Number.isFinite(windowStart) || !Number.isFinite(windowEnd)) {
        throw new Error('Provide --window-start and --window-end for ui window-range.');
      }
      sendWsMessage(socket, {
        type: 'set_window_range',
        windowStart,
        windowEnd,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'auto-scroll') {
      const rawValue = options.enabled;
      if (rawValue === undefined) {
        throw new Error('Provide --enabled true|false for ui auto-scroll.');
      }
      const enabled = parseBooleanOption(rawValue, undefined);
      if (typeof enabled !== 'boolean') {
        throw new Error('Invalid --enabled value. Use true or false.');
      }
      sendWsMessage(socket, {
        type: 'set_auto_scroll',
        enabled,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'fullscreen') {
      const rawValue = options.enabled;
      if (rawValue === undefined) {
        throw new Error('Provide --enabled true|false for ui fullscreen.');
      }
      const enabled = parseBooleanOption(rawValue, undefined);
      if (typeof enabled !== 'boolean') {
        throw new Error('Invalid --enabled value. Use true or false.');
      }
      sendWsMessage(socket, {
        type: 'set_fullscreen',
        enabled,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'add-annotation') {
      const tick = parseOptionalNumber(options.tick, 'tick');
      if (!Number.isFinite(tick) || tick <= 0) {
        throw new Error('Provide --tick for ui add-annotation.');
      }
      const annotationId = options['annotation-id'] ?? options.id;
      const label = options.label;
      const color = options.color;
      sendWsMessage(socket, {
        type: 'add_annotation',
        tick,
        id: annotationId ? String(annotationId) : undefined,
        label: label ? String(label) : undefined,
        color: color ? String(color) : undefined,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'remove-annotation') {
      const annotationId = options['annotation-id'] ?? options.id;
      const tick = parseOptionalNumber(options.tick, 'tick');
      if (!annotationId && !Number.isFinite(tick)) {
        throw new Error('Provide --annotation-id or --tick for ui remove-annotation.');
      }
      sendWsMessage(socket, {
        type: 'remove_annotation',
        id: annotationId ? String(annotationId) : undefined,
        tick: Number.isFinite(tick) ? tick : undefined,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'clear-annotations') {
      sendWsMessage(socket, { type: 'clear_annotations', request_id: requestId });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'jump-annotation') {
      const direction = String(options.direction || '').toLowerCase();
      if (direction !== 'next' && direction !== 'previous') {
        throw new Error('Provide --direction next|previous for ui jump-annotation.');
      }
      sendWsMessage(socket, { type: 'jump_annotation', direction, request_id: requestId });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'add-subtitle') {
      const startTick = parseOptionalNumber(options['start-tick'], 'start-tick');
      const endTick = parseOptionalNumber(options['end-tick'], 'end-tick');
      if (!Number.isFinite(startTick) || !Number.isFinite(endTick)) {
        throw new Error('Provide --start-tick and --end-tick for ui add-subtitle.');
      }
      const text = options.text || options.label;
      if (!text) {
        throw new Error('Provide --text for ui add-subtitle.');
      }
      const subtitleId = options['subtitle-id'] ?? options.id;
      const color = options.color;
      sendWsMessage(socket, {
        type: 'add_subtitle',
        startTick,
        endTick,
        text: String(text),
        id: subtitleId ? String(subtitleId) : undefined,
        color: color ? String(color) : undefined,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'remove-subtitle') {
      const subtitleId = options['subtitle-id'] ?? options.id;
      const startTick = parseOptionalNumber(options['start-tick'], 'start-tick');
      const endTick = parseOptionalNumber(options['end-tick'], 'end-tick');
      const text = options.text || options.label;
      if (!subtitleId && !Number.isFinite(startTick) && !Number.isFinite(endTick) && !text) {
        throw new Error('Provide --subtitle-id, --start-tick/--end-tick, or --text for ui remove-subtitle.');
      }
      sendWsMessage(socket, {
        type: 'remove_subtitle',
        id: subtitleId ? String(subtitleId) : undefined,
        startTick: Number.isFinite(startTick) ? startTick : undefined,
        endTick: Number.isFinite(endTick) ? endTick : undefined,
        text: text ? String(text) : undefined,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'clear-subtitles') {
      sendWsMessage(socket, { type: 'clear_subtitles', request_id: requestId });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'state') {
      sendWsMessage(socket, { type: 'get_state', request_id: requestId });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['state_update'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI state.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'components') {
      const captureId = options['capture-id'];
      const search = options.search;
      const limit = parseOptionalNumber(options.limit, 'limit');
      sendWsMessage(socket, {
        type: 'query_components',
        captureId: captureId ? String(captureId) : undefined,
        search: search ? String(search) : undefined,
        limit: limit ?? undefined,
        request_id: requestId,
      });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['components_list'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI components.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'display-snapshot') {
      const captureId = options['capture-id'];
      const windowSize = parseOptionalNumber(options['window-size'], 'window-size');
      sendWsMessage(socket, {
        type: 'get_display_snapshot',
        captureId: captureId ? String(captureId) : undefined,
        windowSize: windowSize ?? undefined,
        request_id: requestId,
      });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['display_snapshot'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI display snapshot.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'series-window') {
      const captureId = options['capture-id'];
      if (!captureId) {
        throw new Error('Provide --capture-id for ui series-window.');
      }
      const path = parsePathInput(options.path ?? options['path-json']);
      if (!path || path.length === 0) {
        throw new Error('Provide --path (JSON array recommended) for ui series-window.');
      }
      const windowSize = parseOptionalNumber(options['window-size'], 'window-size');
      sendWsMessage(socket, {
        type: 'get_series_window',
        captureId: String(captureId),
        path,
        windowSize: windowSize ?? undefined,
        request_id: requestId,
      });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['series_window'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI series window.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'render-table') {
      const captureId = options['capture-id'];
      const windowSize = parseOptionalNumber(options['window-size'], 'window-size');
      sendWsMessage(socket, {
        type: 'get_render_table',
        captureId: captureId ? String(captureId) : undefined,
        windowSize: windowSize ?? undefined,
        request_id: requestId,
      });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['render_table'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI render table.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'render-debug') {
      const captureId = options['capture-id'];
      const windowSize = parseOptionalNumber(options['window-size'], 'window-size');
      const windowStart = parseOptionalNumber(options['window-start'], 'window-start');
      const windowEnd = parseOptionalNumber(options['window-end'], 'window-end');
      sendWsMessage(socket, {
        type: 'get_render_debug',
        captureId: captureId ? String(captureId) : undefined,
        windowSize: windowSize ?? undefined,
        windowStart: windowStart ?? undefined,
        windowEnd: windowEnd ?? undefined,
        request_id: requestId,
      });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['render_debug'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI render debug.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'debug') {
      sendWsMessage(socket, { type: 'get_ui_debug', request_id: requestId });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['ui_debug'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI debug.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'check') {
      const captureId = options['capture-id'];
      const windowSize = parseOptionalNumber(options['window-size'], 'window-size');
      const windowStart = parseOptionalNumber(options['window-start'], 'window-start');
      const windowEnd = parseOptionalNumber(options['window-end'], 'window-end');

      sendWsMessage(socket, { type: 'get_state', request_id: requestId });
      const stateResponse = await waitForWsResponse(socket, {
        requestId,
        types: ['state_update'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!stateResponse) {
        throw new Error('Timed out waiting for UI state.');
      }
      const state = stateResponse.payload ?? stateResponse;
      const stateWindowStart = typeof state.windowStart === 'number' ? state.windowStart : 1;
      const stateWindowSize = typeof state.windowSize === 'number' ? state.windowSize : 1;
      const stateWindowEnd =
        typeof state.windowEnd === 'number'
          ? state.windowEnd
          : Math.max(1, stateWindowStart + Math.max(1, stateWindowSize) - 1);
      const captures = Array.isArray(state.captures) ? state.captures : [];
      const selectedMetrics = Array.isArray(state.selectedMetrics) ? state.selectedMetrics : [];
      const targetCaptureIds = captureId
        ? [String(captureId)]
        : captures.map((capture) => capture.id);

      sendWsMessage(socket, {
        type: 'get_render_debug',
        captureId: captureId ? String(captureId) : undefined,
        windowSize: windowSize ?? undefined,
        windowStart: windowStart ?? undefined,
        windowEnd: windowEnd ?? undefined,
        request_id: requestId,
      });
      const debugResponse = await waitForWsResponse(socket, {
        requestId,
        types: ['render_debug'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!debugResponse) {
        throw new Error('Timed out waiting for UI render debug.');
      }
      const debug = debugResponse.payload ?? debugResponse;
      const debugCaptures = Array.isArray(debug.captures) ? debug.captures : [];
      const debugById = new Map(debugCaptures.map((entry) => [entry.id, entry]));

      const issues = [];
      const captureSummaries = [];

      function compressRanges(list) {
        const ranges = [];
        for (const value of list) {
          if (!ranges.length || value !== ranges[ranges.length - 1][1] + 1) {
            ranges.push([value, value]);
          } else {
            ranges[ranges.length - 1][1] = value;
          }
        }
        return ranges;
      }

      function findGapRanges(sortedValues) {
        const gaps = [];
        for (let i = 1; i < sortedValues.length; i += 1) {
          const prev = sortedValues[i - 1];
          const next = sortedValues[i];
          if (next > prev + 1) {
            gaps.push([prev + 1, next - 1]);
          }
        }
        return gaps;
      }

      for (const id of targetCaptureIds) {
        const debugCapture = debugById.get(id);
        const captureState = captures.find((entry) => entry.id === id);
        if (!debugCapture && !captureState) {
          issues.push({
            type: 'missing-capture',
            captureId: id,
            message: `Capture ${id} not found in UI state.`,
          });
          continue;
        }

        const tickCount =
          typeof captureState?.tickCount === 'number'
            ? captureState.tickCount
            : (typeof debugCapture?.tickCount === 'number' ? debugCapture.tickCount : 0);
        const recordCount =
          typeof debugCapture?.recordCount === 'number' ? debugCapture.recordCount : 0;

        const selectedForCapture = selectedMetrics.filter((metric) => metric.captureId === id);
        const selectedCount = selectedForCapture.length;

        const summary = {
          captureId: id,
          tickCount,
          recordCount,
          selectedMetricCount: selectedCount,
          duplicateTicks: 0,
          nullTickRanges: [],
          gapRanges: [],
          windowStart:
            typeof debug?.windowStart === 'number'
              ? debug.windowStart
              : (typeof windowStart === 'number' ? windowStart : stateWindowStart),
          windowEnd:
            typeof debug?.windowEnd === 'number'
              ? debug.windowEnd
              : (typeof windowEnd === 'number' ? windowEnd : stateWindowEnd),
        };

        if (debugCapture) {
          if (
            typeof debugCapture.recordCount === 'number'
            && typeof debugCapture.tickCount === 'number'
            && debugCapture.recordCount > debugCapture.tickCount
          ) {
            issues.push({
              type: 'record-count-exceeds-tick-count',
              captureId: id,
              recordCount: debugCapture.recordCount,
              tickCount: debugCapture.tickCount,
            });
          }

          if (debugCapture.recordCount === 0 && selectedCount > 0) {
            issues.push({
              type: 'no-records-for-selected-metrics',
              captureId: id,
            });
          }
        }

        if (selectedCount === 0) {
          captureSummaries.push(summary);
          continue;
        }

        const tableRequestId = buildMessageId(null, `ui-check-table-${id}`);
        sendWsMessage(socket, {
          type: 'get_render_table',
          captureId: String(id),
          windowSize: windowSize ?? undefined,
          windowStart: windowStart ?? undefined,
          windowEnd: windowEnd ?? undefined,
          request_id: tableRequestId,
        });
        const tableResponse = await waitForWsResponse(socket, {
          requestId: tableRequestId,
          types: ['render_table'],
          timeoutMs: timeoutMs + 2000,
        });
        if (!tableResponse) {
          issues.push({
            type: 'render-table-timeout',
            captureId: id,
          });
          captureSummaries.push(summary);
          continue;
        }

        const table = tableResponse.payload ?? tableResponse;
        const rows = Array.isArray(table.rows) ? table.rows : [];
        const ticks = [];
        const nullTicks = [];
        const tickCounts = new Map();

        rows.forEach((row) => {
          const tick = row[0];
          if (typeof tick !== 'number') {
            return;
          }
          ticks.push(tick);
          tickCounts.set(tick, (tickCounts.get(tick) ?? 0) + 1);
          const values = row.slice(1);
          if (values.some((value) => typeof value !== 'number')) {
            nullTicks.push(tick);
          }
        });

        const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => a - b);
        const duplicateTicks = Array.from(tickCounts.values()).reduce(
          (total, count) => total + Math.max(0, count - 1),
          0,
        );
        const nullRanges = compressRanges(nullTicks.sort((a, b) => a - b));
        const gapRanges = findGapRanges(uniqueTicks);

        summary.duplicateTicks = duplicateTicks;
        summary.nullTickRanges = nullRanges;
        summary.gapRanges = gapRanges;
        summary.windowStart = typeof table.windowStart === 'number' ? table.windowStart : summary.windowStart;
        summary.windowEnd = typeof table.windowEnd === 'number' ? table.windowEnd : summary.windowEnd;

        if (duplicateTicks > 0) {
          issues.push({
            type: 'duplicate-ticks',
            captureId: id,
            count: duplicateTicks,
          });
        }
        if (nullRanges.length > 0) {
          issues.push({
            type: 'null-ticks',
            captureId: id,
            ranges: nullRanges,
          });
        }
        if (gapRanges.length > 0) {
          issues.push({
            type: 'missing-ticks',
            captureId: id,
            ranges: gapRanges,
          });
        }

        captureSummaries.push(summary);
      }

      const effectiveWindowStart =
        typeof debug?.windowStart === 'number'
          ? debug.windowStart
          : (typeof windowStart === 'number' ? windowStart : stateWindowStart);
      const effectiveWindowEnd =
        typeof debug?.windowEnd === 'number'
          ? debug.windowEnd
          : (typeof windowEnd === 'number' ? windowEnd : stateWindowEnd);
      const effectiveWindowSize =
        typeof debug?.windowSize === 'number'
          ? debug.windowSize
          : (typeof windowSize === 'number'
              ? windowSize
              : Math.max(1, effectiveWindowEnd - effectiveWindowStart + 1));

      printJson({
        status: issues.length > 0 ? 'discrepancy' : 'ok',
        checkedAt: new Date().toISOString(),
        captureId: captureId ? String(captureId) : 'all',
        windowStart: effectiveWindowStart,
        windowEnd: effectiveWindowEnd,
        windowSize: effectiveWindowSize,
        issues,
        captures: captureSummaries,
      });
      return;
    }

    if (subcommand === 'memory-stats') {
      sendWsMessage(socket, { type: 'get_memory_stats', request_id: requestId });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['memory_stats'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI memory stats.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'metric-coverage') {
      const captureId = options['capture-id'];
      sendWsMessage(socket, {
        type: 'get_metric_coverage',
        captureId: captureId ? String(captureId) : undefined,
        request_id: requestId,
      });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['metric_coverage'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI metric coverage.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'capabilities') {
      sendWsMessage(socket, { type: 'hello', request_id: requestId });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['capabilities'],
        timeoutMs,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI capabilities.');
      }
      printJson(response.payload ?? response);
      return;
    }

    throw new Error(`Unknown ui subcommand: ${subcommand}`);
  } finally {
    if (!socketClosed) {
      socket.close();
    }
  }
}

async function handleUiServe(options) {
  const uiOptions = resolveUiServeOptions(options);
  const probe = await probeUiServer({
    host: uiOptions.host,
    port: uiOptions.port,
    timeoutMs: uiOptions.timeoutMs,
  });

  if (probe.running) {
    if (!probe.isUi) {
      throw new Error(
        `Port ${uiOptions.port} is in use but does not look like the Metrics UI.`,
      );
    }
    const uiStateFile = resolveUiStateFile(options);
    const uiState = loadUiState(uiStateFile);
    const key = buildUiKey(uiOptions.host, uiOptions.port);
    const existing = uiState.deployments[key];
    const existingPid = Number(existing?.pid);
    const pid = Number.isFinite(existingPid) && isProcessAlive(existingPid) ? existingPid : null;
    uiState.deployments[key] = {
      key,
      host: uiOptions.host,
      port: uiOptions.port,
      url: probe.url,
      pid,
      uiDir: existing?.uiDir ?? uiOptions.uiDir ?? null,
      mode: existing?.mode ?? uiOptions.mode ?? null,
      logFile: existing?.logFile ?? null,
      startedAt: existing?.startedAt ?? null,
      discoveredAt: new Date().toISOString(),
    };
    saveUiState(uiStateFile, uiState);
    printJson({
      status: 'running',
      url: probe.url,
      pid,
      stateFile: uiStateFile,
    });
    return;
  }

  await ensureUiDependencies(uiOptions.uiDir, uiOptions.skipInstall);

  const logFile = resolveCliLogFile(options, 'ui');
  const url = `http://${uiOptions.host}:${uiOptions.port}`;
  console.log(`[ui] starting Metrics UI (${uiOptions.mode}) at ${url}`);

  const env = {
    ...process.env,
    HOST: uiOptions.host,
    PORT: String(uiOptions.port),
  };
  const script = uiOptions.mode === 'start' ? 'start' : 'dev';
  const pid = spawnDetachedProcess({
    command: 'npm',
    args: ['--prefix', uiOptions.uiDir, 'run', script],
    cwd: uiOptions.uiDir,
    env,
    logFile,
  });
  const uiStateFile = resolveUiStateFile(options);
  const uiState = loadUiState(uiStateFile);
  const key = buildUiKey(uiOptions.host, uiOptions.port);
  uiState.deployments[key] = {
    key,
    host: uiOptions.host,
    port: uiOptions.port,
    url,
    pid,
    uiDir: uiOptions.uiDir,
    mode: uiOptions.mode,
    logFile,
    startedAt: new Date().toISOString(),
  };
  saveUiState(uiStateFile, uiState);
  printJson({
    status: 'started',
    url,
    pid,
    logFile,
    stateFile: uiStateFile,
  });
}

async function handleUiShutdown(options) {
  const uiUrl = resolveUiShutdownUrl(options);
  const response = await requestJson(`${uiUrl}/api/shutdown`, { method: 'POST' });
  const uiStateFile = resolveUiStateFile(options);
  const uiState = loadUiState(uiStateFile);
  const key = buildUiKeyFromUrl(uiUrl);
  if (key && uiState.deployments[key]) {
    delete uiState.deployments[key];
    saveUiState(uiStateFile, uiState);
  }
  printJson({ url: uiUrl, response });
}

async function handleConfig(argvRest) {
  const { options, positional } = parseArgs(argvRest);
  if (options.help) {
    printUsage('config');
    return;
  }

  const subcommand = positional[0] || 'show';
  const resolved = resolveCliConfigLocation(argv ?? [], DEFAULT_CLI_CONFIG_PATH);
  const configPath = resolved.path;
  if (!configPath) {
    throw new Error('Missing CLI config path.');
  }

  if (subcommand === 'show' || subcommand === 'get') {
    const configState = readCliConfigFile(configPath);
    printJson({
      path: configPath,
      exists: configState.exists,
      config: redactCliConfig(configState.data),
    });
    return;
  }

  if (subcommand === 'set') {
    const configState = readCliConfigFile(configPath);
    const updated = { ...configState.data };
    let changed = false;

    const server = readConfigOption(options, 'server', '--server');
    if (server !== null) {
      updated.server = server;
      changed = true;
    }

    const token = readConfigOption(options, 'token', '--token');
    if (token !== null) {
      updated.token = token;
      changed = true;
    }

    const morphApiKey = readConfigOption(options, 'morph-api-key', '--morph-api-key');
    if (morphApiKey !== null) {
      updated.morphApiKey = morphApiKey;
      changed = true;
    }

    const snapshot = readConfigOption(options, 'snapshot', '--snapshot');
    if (snapshot !== null) {
      updated.snapshot = snapshot;
      changed = true;
    }

    const fleetConfig = readConfigOption(options, 'fleet-config', '--fleet-config');
    if (fleetConfig !== null) {
      updated.fleetConfig = fleetConfig;
      changed = true;
    }

    const workspace = readConfigOption(options, 'workspace', '--workspace');
    if (workspace !== null) {
      updated.workspace = workspace;
      changed = true;
    }

    const uiUrl = readConfigOption(options, 'ui', '--ui');
    if (uiUrl !== null) {
      updated.uiUrl = uiUrl;
      changed = true;
    }

    const uiDir = readConfigOption(options, 'ui-dir', '--ui-dir');
    if (uiDir !== null) {
      updated.uiDir = uiDir;
      changed = true;
    }

    const uiHost = readConfigOption(options, 'ui-host', '--ui-host');
    if (uiHost !== null) {
      updated.uiHost = uiHost;
      changed = true;
    }

    const uiPort = readConfigOption(options, 'ui-port', '--ui-port');
    if (uiPort !== null) {
      parseOptionalNumber(uiPort, 'ui-port');
      updated.uiPort = uiPort;
      changed = true;
    }

    const uiMode = readConfigOption(options, 'ui-mode', '--ui-mode');
    if (uiMode !== null) {
      updated.uiMode = normalizeUiServeMode(uiMode);
      changed = true;
    }

    if (!changed) {
      throw new Error(
        'No config fields provided. Use --token, --morph-api-key, --server, --snapshot, ' +
          '--fleet-config, --workspace, --ui, --ui-dir, --ui-host, --ui-port, or --ui-mode.',
      );
    }

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
    console.log(`[config] wrote ${configPath}`);
    return;
  }

  throw new Error(`Unknown config subcommand: ${subcommand}`);
}

async function handleRun(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('run');
    return;
  }

  if (subcommand === 'create') {
    const runsRoot = resolveRunsRoot(options);
    const server = resolveServerUrl(options);
    const name = options.name || '';
    const notes = options.notes || '';

    const run = createRunMetadata({
      id: buildRunId(),
      name,
      server,
      notes,
    });

    const runDir = path.join(runsRoot, run.id);
    fs.mkdirSync(runDir, { recursive: true });
    writeRunMetadata(runDir, run);

    console.log(`[run] Created ${run.id}`);
    console.log(`path: ${runDir}`);
    printJson(run);
    return;
  }

  if (subcommand === 'show') {
    const runContext = resolveRunContext(options);
    if (!runContext) {
      throw new Error('Missing --run for run show.');
    }
    printJson(runContext.data);
    return;
  }

  if (subcommand === 'record') {
    const runContext = resolveRunContext(options);
    if (!runContext) {
      throw new Error('Missing --run for run record.');
    }

    const server = resolveServerUrl(options, runContext);
    const authHeader = resolveAuthHeader(options);
    const streamInput = options.stream || 'simulation';
    const streamPath = resolveStreamPath(streamInput);
    const url = streamPath.startsWith('http://') || streamPath.startsWith('https://')
      ? streamPath
      : buildUrl(server, streamPath);

    const format = (options.format || 'jsonl').toLowerCase();
    if (format !== 'jsonl' && format !== 'json') {
      throw new Error('Invalid --format value. Expected jsonl or json.');
    }

    const maxFrames = parseOptionalNumber(options.frames, 'frames');
    const durationMs = parseOptionalNumber(options.duration, 'duration');
    if (!maxFrames && !durationMs) {
      throw new Error('Provide --frames or --duration to bound the capture.');
    }

    const componentId = options.component || '';
    const entityId = options.entity || '';
    const includeAcks = Boolean(options['include-acks']);
    const skipStart = Boolean(options['no-start']);
    const pauseAfter = Boolean(options.pause);
    const skipStop = Boolean(options['no-stop']);

    const outputPath = resolveCapturePath(options.out, runContext, streamInput, format);

    if (!skipStart) {
      const startMessageId = buildMessageId(runContext.id, 'run-start');
      await requestJson(
        buildUrl(server, '/simulation/start'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId: startMessageId }),
        },
        authHeader,
      );
      recordRunEvent(runContext, { type: 'playback', action: 'start', messageId: startMessageId });
    }

    let captureSummary;
    try {
      captureSummary = await captureStream({
        url,
        outputPath,
        format,
        maxFrames,
        durationMs,
        componentId,
        entityId,
        includeAcks,
        authHeader,
      });
    } finally {
      if (!skipStop) {
        const action = pauseAfter ? 'pause' : 'stop';
        const stopMessageId = buildMessageId(runContext.id, `run-${action}`);
        await requestJson(
          buildUrl(server, `/simulation/${action}`),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId: stopMessageId }),
          },
          authHeader,
        ).catch(() => undefined);
        recordRunEvent(runContext, { type: 'playback', action, messageId: stopMessageId });
      }
    }

    if (captureSummary) {
      console.log(`[run] capture saved to ${captureSummary.outputPath}`);
      recordRunCapture(runContext, {
        type: 'capture',
        stream: streamInput,
        format,
        outputPath: captureSummary.outputPath,
        recordCount: captureSummary.recordCount,
        frameCount: captureSummary.frameCount,
        ackCount: captureSummary.ackCount,
        durationMs: captureSummary.durationMs,
        componentId: componentId || null,
        entityId: entityId || null,
        includeAcks,
      });
    }
    return;
  }

  throw new Error(`Unknown run subcommand: ${subcommand}`);
}

async function handleWait(argvRest) {
  const { options } = parseArgs(argvRest);
  if (options.help) {
    printUsage('wait');
    return;
  }

  const desiredState = options.state;
  if (!desiredState) {
    throw new Error('Missing --state for wait.');
  }

  const player = normalizePlayer(options.player);
  const runContext = resolveRunContext(options);
  const server = resolveServerUrl(options, runContext);
  const authHeader = resolveAuthHeader(options);

  const timeoutMs = parseOptionalNumber(options.timeout, 'timeout') ?? 30000;
  const intervalMs = parseOptionalNumber(options.interval, 'interval') ?? 500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await requestJson(buildUrl(server, '/status'), { method: 'GET' }, authHeader);
    const status = response?.[player]?.state;
    if (status === desiredState) {
      console.log(`[wait] ${player} is ${desiredState}`);
      return;
    }
    await delay(intervalMs);
  }

  throw new Error(`Timed out waiting for ${player} to reach state ${desiredState}.`);
}

async function handleDeploy(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('deploy');
    return;
  }

  if (subcommand === 'start') {
    await deployStart(options);
    return;
  }

  if (subcommand === 'stop') {
    await deployStop(options);
    return;
  }

  if (subcommand === 'list') {
    deployList(options);
    return;
  }

  throw new Error(`Unknown deploy subcommand: ${subcommand}`);
}

async function handleLog(argvRest) {
  const { options, positional } = parseArgs(argvRest);
  if (options.help) {
    printUsage('log');
    return;
  }

  const subcommand = positional[0] || 'list';
  if (subcommand === 'list') {
    const logDir = resolveCliLogDir(options);
    const typeFilter = options.type ? String(options.type).toLowerCase() : null;
    const entries = listCliLogs(logDir, typeFilter);
    if (entries.length === 0) {
      printJson({ logDir, entries: [] });
      return;
    }
    printJson({ logDir, entries });
    return;
  }

  if (subcommand === 'view') {
    const logDir = resolveCliLogDir(options);
    const target = options.file || options.id || positional[1];
    if (!target) {
      throw new Error('Provide --file, --id, or a filename to view.');
    }
    const resolved = resolveCliLogTarget(logDir, String(target), options.type);
    const content = fs.readFileSync(resolved, 'utf8');
    process.stdout.write(content);
    return;
  }

  throw new Error(`Unknown log subcommand: ${subcommand}`);
}

async function handleCodebase(argvRest) {
  const [subcommand, ...rest] = argvRest;
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printUsage('codebase');
    return;
  }

  const { options } = parseArgs(rest);
  if (options.help) {
    printUsage('codebase');
    return;
  }

  const server = resolveServerUrl(options);
  const authHeader = resolveAuthHeader(options);

  if (subcommand === 'tree') {
    const queryPath = options.path ? `?path=${encodeURIComponent(String(options.path))}` : '';
    const url = buildUrl(server, `/codebase/tree${queryPath}`);
    const response = await requestJson(url, { method: 'GET' }, authHeader);
    printJson(response);
    return;
  }

  if (subcommand === 'file') {
    const filePath = options.path ?? options.file;
    if (!filePath) {
      throw new Error('Missing --path for codebase file.');
    }
    const url = buildUrl(server, `/codebase/file?path=${encodeURIComponent(String(filePath))}`);
    const response = await requestJson(url, { method: 'GET' }, authHeader);
    printJson(response);
    return;
  }

  throw new Error(`Unknown codebase subcommand: ${subcommand}`);
}

async function handleFleet(argvRest) {
  const { options, positional } = parseArgs(argvRest);
  if (options.help) {
    printUsage('fleet');
    return;
  }

  const subcommand = positional[0];
  if (subcommand) {
    if (subcommand !== 'scaffold') {
      throw new Error(`Unknown fleet subcommand: ${subcommand}`);
    }
    const outInput =
      options.out ||
      options.config ||
      options.file ||
      options['config-file'] ||
      'fleet.json';
    const outputPath = path.resolve(process.cwd(), String(outInput));
    writeFleetScaffold({
      outputPath,
      force: Boolean(options.force),
    });
    console.log(`[fleet] scaffold written to ${outputPath}`);
    return;
  }

  const configPath = resolveFleetConfigPath(options);
  if (!configPath) {
    throw new Error('Missing --config for fleet (or set fleetConfig in ~/.simeval/config.json).');
  }

  const config = loadFleetConfig(configPath);
  applyCliFleetDefaults(config);
  const configDir = path.dirname(configPath);
  const runId = buildFleetRunId();

  const uiOverride = options.ui || options.ws || options['ui-url'] || options['ws-url'];
  const uiUrl = uiOverride
    ? await resolveUiWsUrl(uiOverride)
    : config.ui?.url
      ? await resolveUiWsUrl(config.ui.url)
      : CLI_CONFIG?.data?.uiUrl
        ? await resolveUiWsUrl(CLI_CONFIG.data.uiUrl)
        : '';
  if (!uiOverride && !config.ui?.url && CLI_CONFIG?.data?.uiUrl) {
    console.log(`[ui] using default ui url (fleet): ${CLI_CONFIG.data.uiUrl}`);
  }
  if (uiOverride && !uiUrl) {
    throw new Error('Invalid --ui value. Provide a ws:// or http(s):// URL.');
  }
  if (config.ui?.url && !uiUrl) {
    throw new Error('Invalid ui.url in config. Provide a ws:// or http(s):// URL.');
  }

  const defaults = normalizeFleetDefaults(config.defaults);
  const continueOnError = parseBooleanOption(
    options['continue-on-error'] ?? config.continueOnError,
    false,
  );

  const results = {
    status: 'ok',
    config: configPath,
    runId,
    deployments: [],
    errors: [],
  };

  for (let deploymentIndex = 0; deploymentIndex < config.deployments.length; deploymentIndex += 1) {
    const deployment = mergeFleetDeployment(defaults, config.deployments[deploymentIndex]);
    const deploymentName = String(
      deployment.name || `deployment-${deploymentIndex + 1}`,
    );
    const deploymentUiUrl = uiOverride
      ? uiUrl
      : deployment.ui?.url
        ? await resolveUiWsUrl(deployment.ui.url)
        : uiUrl;
    if (deployment.ui?.url && !deploymentUiUrl) {
      throw new Error(`Invalid ui.url for deployment ${deploymentName}.`);
    }
    const deploymentLog = buildFleetLogger({ deployment: deploymentName });
    const deploymentResult = {
      name: deploymentName,
      status: 'ok',
      instances: [],
      errors: [],
    };

    deploymentLog(`Starting (${deployment.count} instance${deployment.count === 1 ? '' : 's'})`);

    try {
      const provisioned = await runFleetProvision({
        deployment,
        deploymentName,
        log: deploymentLog,
      });
      const instances = Array.isArray(provisioned?.instances) ? provisioned.instances : [];
      const morphStateFile =
        provisioned?.stateFile ||
        deployment.provision?.stateFile ||
        resolveMorphcloudStateFile(options);
      deploymentResult.stateFile = morphStateFile;
      if (instances.length === 0) {
        throw new Error('Provisioning returned zero instances.');
      }

      for (let instanceIndex = 0; instanceIndex < instances.length; instanceIndex += 1) {
        const instance = instances[instanceIndex];
        const instanceName =
          instance?.name || `${deploymentName}-${instanceIndex + 1}`;
        const instanceLog = buildFleetLogger({
          deployment: deploymentName,
          instance: instanceName,
        });
        const instanceResult = {
          id: instance?.id ?? null,
          name: instanceName,
          apiUrl: instance?.apiUrl ?? null,
          authToken: instance?.authToken ?? null,
          status: 'ok',
          captures: [],
          snapshot: null,
          cleanup: null,
          labels: null,
          errors: [],
        };
        const tokens = buildFleetTemplateTokens({
          deploymentName,
          instanceName,
          instanceIndex,
          instanceId: instance?.id ?? null,
          runId,
        });

        try {
          if (!instance?.apiUrl) {
            throw new Error('Missing apiUrl in provisioned instance.');
          }

          const instanceLabels = renderFleetMetadataEntries(
            deployment.labels.instance,
            tokens,
            'labels.instance',
          );
          if (instanceLabels.length > 0) {
            await applyFleetInstanceMetadata({
              instanceId: instance.id,
              labels: instanceLabels,
              log: instanceLog,
            });
            instanceResult.labels = {
              instance: instanceLabels,
              snapshot: null,
            };
          }

          await waitForFleetServer({
            server: instance.apiUrl,
            authHeader: buildAuthHeader(instance.authToken),
            timeoutMs: deployment.readyTimeoutMs,
            intervalMs: deployment.readyIntervalMs,
            log: instanceLog,
          });

          if (deployment.postProvision?.exec?.length) {
            await runFleetExec({
              instanceId: instance.id,
              commands: deployment.postProvision.exec,
              log: instanceLog,
            });
          }

          if (deployment.plugins.length > 0) {
            await uploadFleetPlugins({
              plugins: deployment.plugins,
              configDir,
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
          }

          if (deployment.components.length > 0) {
            await injectFleetComponents({
              components: deployment.components,
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
          }

          if (deployment.systems.length > 0) {
            await injectFleetSystems({
              systems: deployment.systems,
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
          }

          if (deployment.components.length > 0 || deployment.systems.length > 0) {
            await logFleetStatusAfterInjection({
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              deployment,
              log: instanceLog,
            });
          }

          if (deployment.playback?.start) {
            await runFleetPlayback({
              action: 'start',
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
          }

          const capturePlans = await prepareFleetCaptures({
            captures: deployment.captures,
            configDir,
            deploymentName,
            instanceIndex,
            instance,
            runId,
            defaultUiUrl: deploymentUiUrl,
            defaultPollSeconds: deployment.ui?.pollSeconds ?? config.ui?.pollSeconds,
            log: instanceLog,
          });

          if (capturePlans.length > 0) {
            const runCaptures = deployment.captureMode === 'sequential'
              ? runFleetCapturesSequential
              : runFleetCapturesParallel;
            const summaries = await runCaptures({
              plans: capturePlans,
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
            instanceResult.captures = summaries;
          }

          if (deployment.cleanup.snapshot) {
            const snapshotLabels = renderFleetMetadataEntries(
              deployment.labels.snapshot,
              tokens,
              'labels.snapshot',
            );
            const snapshotResult = await runFleetSnapshot({
              instanceId: instance.id,
              labels: snapshotLabels,
              log: instanceLog,
            });
            instanceResult.snapshot = snapshotResult;
            if (snapshotLabels.length > 0) {
              if (!instanceResult.labels) {
                instanceResult.labels = { instance: [], snapshot: snapshotLabels };
              } else {
                instanceResult.labels.snapshot = snapshotLabels;
              }
            }
            recordFleetSnapshotState({
              stateFile: morphStateFile,
              instanceId: instance.id,
              snapshot: snapshotResult,
              runId,
            });
          }

          if (deployment.playback?.pause) {
            await runFleetPlayback({
              action: 'pause',
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
          } else if (deployment.playback?.stop) {
            await runFleetPlayback({
              action: 'stop',
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
          }

          if (deployment.cleanup.stop) {
            const stopResult = await runFleetStopInstance({
              instanceId: instance.id,
              log: instanceLog,
            });
            instanceResult.cleanup = { stop: stopResult };
            recordFleetStopState({
              stateFile: morphStateFile,
              instanceId: instance.id,
              forget: deployment.cleanup.forget,
            });
          }
        } catch (error) {
          instanceResult.status = 'failed';
          const message = error instanceof Error ? error.message : String(error);
          instanceResult.errors.push(message);
          deploymentResult.errors.push(`${instanceName}: ${message}`);
          instanceLog(`Failed: ${message}`);
          await captureFleetFailureDiagnostics({ instanceId: instance?.id, log: instanceLog });
          if (deployment.cleanup.stopOnFailure && instance?.id) {
            try {
              const stopResult = await runFleetStopInstance({
                instanceId: instance.id,
                log: instanceLog,
              });
              instanceResult.cleanup = { stopOnFailure: stopResult };
              recordFleetStopState({
                stateFile: morphStateFile,
                instanceId: instance.id,
                forget: deployment.cleanup.forget,
              });
            } catch (stopError) {
              const stopMessage = stopError instanceof Error ? stopError.message : String(stopError);
              instanceResult.errors.push(`Cleanup stop failed: ${stopMessage}`);
              instanceLog(`Cleanup stop failed: ${stopMessage}`);
            }
          }
          if (!continueOnError) {
            throw error;
          }
        }

        deploymentResult.instances.push(instanceResult);
      }
    } catch (error) {
      deploymentResult.status = 'failed';
      const message = error instanceof Error ? error.message : String(error);
      deploymentResult.errors.push(message);
      results.errors.push(`${deploymentName}: ${message}`);
      deploymentLog(`Failed: ${message}`);
      if (!continueOnError) {
        throw error;
      }
    }

    if (deploymentResult.errors.length > 0 && deploymentResult.status !== 'failed') {
      deploymentResult.status = 'partial';
    }

    results.deployments.push(deploymentResult);
  }

  const hasErrors =
    results.errors.length > 0 ||
    results.deployments.some((deployment) => deployment.status !== 'ok');
  if (hasErrors) {
    results.status = continueOnError ? 'partial' : 'failed';
  }

  printJson(results);
}

async function handleMorphcloud(argvRest) {
  if (argvRest.length === 0) {
    argvRest = ['--help'];
  }
  const distributorPath = path.resolve(__dirname, 'morphcloud_distributor.js');
  await runCommand('node', [distributorPath, ...argvRest], { cwd: __dirname });
}

function resolveFleetConfigPath(options) {
  const configInput = options.config || options.file || options['config-file'];
  if (configInput) {
    return path.resolve(process.cwd(), String(configInput));
  }
  if (CLI_CONFIG?.data?.fleetConfig) {
    return path.resolve(CLI_CONFIG.dir, String(CLI_CONFIG.data.fleetConfig));
  }
  return '';
}

function applyCliFleetDefaults(config) {
  if (!CLI_CONFIG?.data?.snapshot) {
    return;
  }
  if (!config.defaults || typeof config.defaults !== 'object') {
    config.defaults = {};
  }
  if (!config.defaults.snapshot) {
    config.defaults.snapshot = CLI_CONFIG.data.snapshot;
  }
}

function loadFleetConfig(configPath) {
  let raw;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read config file: ${configPath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse config JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Fleet config must be a JSON object.');
  }
  if (!Array.isArray(parsed.deployments) || parsed.deployments.length === 0) {
    throw new Error('Fleet config must include a non-empty deployments array.');
  }

  return parsed;
}

function buildFleetScaffold() {
  return {
    ui: {
      url: 'ws://localhost:5050/ws/control',
      pollSeconds: 2,
    },
    defaults: {
      snapshot: 'SNAPSHOT_ID',
      mode: 'build',
      count: 1,
      parallel: 1,
      readyTimeoutMs: 60000,
      readyIntervalMs: 2000,
      captureMode: 'parallel',
      labels: {
        instance: DEFAULT_FLEET_LABELS.instance.slice(),
        snapshot: DEFAULT_FLEET_LABELS.snapshot.slice(),
      },
      cleanup: {
        snapshot: true,
        stop: true,
        stopOnFailure: true,
        forget: false,
      },
      provision: {
        args: ['--skip-tests'],
      },
      playback: {
        start: true,
        stop: true,
      },
      postProvision: {
        exec: [],
      },
      plugins: [],
      components: [],
      systems: [],
      captures: [
        {
          stream: 'evaluation',
          frames: 200,
          out: 'verification/fleet_runs/${deployment}/${instance}_evaluation.jsonl',
          ui: {
            captureId: '${deployment}-${instance}-eval',
            filename: '${deployment}_${instance}_evaluation.jsonl',
          },
        },
      ],
    },
    deployments: [
      {
        name: 'example',
        count: 1,
      },
    ],
  };
}

function writeFleetScaffold({ outputPath, force }) {
  if (fs.existsSync(outputPath) && !force) {
    throw new Error(`File already exists: ${outputPath}. Use --force to overwrite.`);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(buildFleetScaffold(), null, 2)}\n`, 'utf8');
}

function normalizeFleetDefaults(value) {
  const defaults = value && typeof value === 'object' ? { ...value } : {};
  if (!Object.prototype.hasOwnProperty.call(defaults, 'labels')) {
    defaults.labels = {
      instance: DEFAULT_FLEET_LABELS.instance.slice(),
      snapshot: DEFAULT_FLEET_LABELS.snapshot.slice(),
    };
  }
  if (!Object.prototype.hasOwnProperty.call(defaults, 'cleanup')) {
    defaults.cleanup = { ...DEFAULT_FLEET_CLEANUP };
  }
  return defaults;
}

function mergeFleetDeployment(defaults, deployment) {
  if (!deployment || typeof deployment !== 'object') {
    throw new Error('Each deployment must be an object.');
  }

  const merged = {
    ...defaults,
    ...deployment,
    provision: {
      ...(defaults.provision ?? {}),
      ...(deployment.provision ?? {}),
    },
    playback: {
      ...(defaults.playback ?? {}),
      ...(deployment.playback ?? {}),
    },
    ui: {
      ...(defaults.ui ?? {}),
      ...(deployment.ui ?? {}),
    },
    postProvision: {
      ...(defaults.postProvision ?? {}),
      ...(deployment.postProvision ?? {}),
    },
  };

  merged.snapshot = merged.snapshot ?? defaults.snapshot ?? null;
  if (!merged.snapshot) {
    throw new Error('Deployment is missing snapshot.');
  }

  merged.mode = normalizeFleetMode(merged.mode ?? 'build');
  merged.count = coercePositiveInt(merged.count ?? 1, 'count');
  merged.parallel = coercePositiveInt(
    merged.parallel ?? merged.provision?.parallel ?? defaults.parallel ?? 1,
    'parallel',
  );
  merged.readyTimeoutMs = coercePositiveInt(
    merged.readyTimeoutMs ?? defaults.readyTimeoutMs ?? 60000,
    'readyTimeoutMs',
  );
  merged.readyIntervalMs = coercePositiveInt(
    merged.readyIntervalMs ?? defaults.readyIntervalMs ?? 2000,
    'readyIntervalMs',
  );
  merged.captureMode =
    merged.captureMode === 'sequential' ? 'sequential' : 'parallel';

  merged.plugins = mergeFleetArray(defaults.plugins, deployment.plugins, 'plugins');
  merged.components = mergeFleetArray(defaults.components, deployment.components, 'components');
  merged.systems = mergeFleetArray(defaults.systems, deployment.systems, 'systems');
  merged.captures = mergeFleetArray(defaults.captures, deployment.captures, 'captures');

  merged.playback = {
    start: parseBooleanOption(merged.playback?.start, true),
    stop: parseBooleanOption(merged.playback?.stop, true),
    pause: parseBooleanOption(merged.playback?.pause, false),
  };

  merged.ui = {
    ...merged.ui,
    pollSeconds: normalizePollSeconds(merged.ui?.pollSeconds),
  };

  merged.provision = {
    ...merged.provision,
    args: mergeFleetArray(defaults.provision?.args, deployment.provision?.args, 'provision.args'),
    skipUpdate: parseBooleanOption(merged.provision?.skipUpdate, true),
    requireUpdate: parseBooleanOption(merged.provision?.requireUpdate, false),
  };

  merged.postProvision = {
    exec: mergeFleetArray(defaults.postProvision?.exec, deployment.postProvision?.exec, 'postProvision.exec'),
  };

  const defaultLabels = normalizeFleetLabels(defaults.labels);
  const deploymentLabels = normalizeFleetLabels(deployment.labels);
  merged.labels = {
    instance: mergeFleetMetadata(defaultLabels.instance, deploymentLabels.instance, 'labels.instance'),
    snapshot: mergeFleetMetadata(defaultLabels.snapshot, deploymentLabels.snapshot, 'labels.snapshot'),
  };

  const defaultCleanup = normalizeFleetCleanup(defaults.cleanup);
  const deploymentCleanup = normalizeFleetCleanup(deployment.cleanup);
  merged.cleanup = {
    snapshot: parseBooleanOption(deploymentCleanup.snapshot, defaultCleanup.snapshot ?? false),
    stop: parseBooleanOption(deploymentCleanup.stop, defaultCleanup.stop ?? false),
    stopOnFailure: parseBooleanOption(
      deploymentCleanup.stopOnFailure,
      defaultCleanup.stopOnFailure ?? false,
    ),
    forget: parseBooleanOption(deploymentCleanup.forget, defaultCleanup.forget ?? false),
  };

  return merged;
}

function normalizeFleetMode(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'build' || normalized === 'clone') {
    return normalized;
  }
  throw new Error(`Invalid mode: ${value}. Expected build or clone.`);
}

function coercePositiveInt(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function coercePositiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function normalizePollSeconds(value) {
  if (value === undefined || value === null || value === '') {
    return 2;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid pollSeconds: ${value}`);
  }
  return parsed;
}

function mergeFleetArray(defaultValue, overrideValue, label) {
  const base = defaultValue === undefined ? [] : defaultValue;
  if (overrideValue === undefined) {
    if (!Array.isArray(base)) {
      throw new Error(`Expected ${label} to be an array.`);
    }
    return base.slice();
  }
  if (overrideValue === null) {
    return [];
  }
  if (!Array.isArray(overrideValue)) {
    throw new Error(`Expected ${label} to be an array.`);
  }
  return Array.isArray(base) ? base.concat(overrideValue) : overrideValue.slice();
}

function normalizeFleetLabels(value) {
  return value && typeof value === 'object' ? value : {};
}

function normalizeFleetCleanup(value) {
  return value && typeof value === 'object' ? value : {};
}

function normalizeFleetMetadataValue(value, label) {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string') {
    return [value];
  }
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, entryValue]) => `${key}=${entryValue}`);
  }
  throw new Error(`Expected ${label} to be an array, string, or object.`);
}

function mergeFleetMetadata(defaultValue, overrideValue, label) {
  const base = normalizeFleetMetadataValue(defaultValue, label);
  if (overrideValue === undefined) {
    return base.slice();
  }
  if (overrideValue === null) {
    return [];
  }
  const override = normalizeFleetMetadataValue(overrideValue, label);
  return base.concat(override);
}

function buildFleetLogger({ deployment, instance } = {}) {
  const parts = ['fleet'];
  if (deployment) {
    parts.push(deployment);
  }
  if (instance) {
    parts.push(instance);
  }
  const prefix = parts.join(':');
  return (message) => console.log(`[${prefix}] ${message}`);
}

function buildFleetRunId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '');
}

function buildFleetTemplateTokens({
  deploymentName,
  instanceName,
  instanceIndex,
  instanceId,
  runId,
}) {
  return {
    deployment: String(deploymentName ?? ''),
    instance: String(instanceName ?? ''),
    index: String((instanceIndex ?? 0) + 1),
    instanceId: instanceId ? String(instanceId) : '',
    runId: runId ? String(runId) : '',
  };
}

async function runFleetProvision({ deployment, deploymentName, log }) {
  const namePrefix =
    deployment.provision?.namePrefix ??
    deployment.namePrefix ??
    deployment.name ??
    deploymentName;
  const args = [
    'provision',
    '--snapshot',
    String(deployment.snapshot),
    '--mode',
    deployment.mode,
    '--count',
    String(deployment.count),
    '--parallel',
    String(deployment.parallel),
    '--name-prefix',
    String(namePrefix),
  ];
  if (deployment.provision?.memory) {
    args.push('--memory', String(deployment.provision.memory));
  }
  if (deployment.provision?.vcpus) {
    args.push('--vcpus', String(deployment.provision.vcpus));
  }

  if (deployment.provision?.stateFile) {
    args.push('--state', String(deployment.provision.stateFile));
  }
  if (deployment.provision?.skipUpdate) {
    args.push('--skip-update');
  }
  if (deployment.provision?.requireUpdate) {
    args.push('--require-update');
  }
  if (deployment.provision?.args?.length) {
    args.push(...deployment.provision.args.map(String));
  }

  log(`Provisioning ${deployment.count} instance(s) from ${deployment.snapshot} (${deployment.mode})`);

  const distributorPath = path.resolve(__dirname, 'morphcloud_distributor.js');
  const result = await runCommandCapture('node', [distributorPath, ...args], {
    cwd: __dirname,
    prefix: `[fleet:${deploymentName}] `,
  });

  if (result.code !== 0) {
    throw new Error(`Provisioning failed with code ${result.code}`);
  }

  const parsed = extractJsonFromOutput(result.stdout);
  if (!parsed) {
    throw new Error('Provisioning output did not include JSON payload.');
  }
  return parsed;
}

async function runFleetExec({ instanceId, commands, log }) {
  if (!instanceId) {
    throw new Error('Missing instance id for postProvision exec.');
  }
  const execCommands = Array.isArray(commands) ? commands : [];
  for (const command of execCommands) {
    if (!command || typeof command !== 'string') {
      continue;
    }
    log(`Exec: ${command}`);
    const wrappedCommand = wrapShellCommand(command);
    const result = await runCommandCapture(
      'morphcloud',
      ['instance', 'exec', instanceId, '--', 'bash', '-lc', wrappedCommand],
      { prefix: `[exec:${instanceId}] ` },
    );
    if (result.code !== 0) {
      throw new Error(`Exec failed (${command}) with code ${result.code}`);
    }
  }
}

async function captureFleetFailureDiagnostics({ instanceId, log }) {
  if (!instanceId) {
    return;
  }
  const command = 'journalctl -u simeval.service --no-pager -n 200';
  log(`Diagnostics: ${command}`);
  try {
    const result = await runCommandCapture(
      'morphcloud',
      ['instance', 'exec', instanceId, '--', 'bash', '-lc', wrapShellCommand(command)],
      { prefix: `[journalctl:${instanceId}] ` },
    );
    if (result.code !== 0) {
      log(`Diagnostics failed with code ${result.code}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Diagnostics failed: ${message}`);
  }
}

async function waitForFleetServer({ server, authHeader, timeoutMs, intervalMs, log }) {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  let lastError = null;

  while (Date.now() < deadline) {
    attempt += 1;
    try {
      await requestJson(buildUrl(server, '/health'), { method: 'GET' }, authHeader);
      log('Server ready.');
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 1 || attempt % 3 === 0) {
        const message = error instanceof Error ? error.message : String(error);
        log(`Waiting for server... (${message})`);
      }
    }
    await delay(intervalMs);
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Timed out waiting for server: ${message}`);
}

async function uploadFleetPlugins({ plugins, configDir, server, authHeader, log }) {
  for (const entry of plugins) {
    const plugin = normalizeFleetPluginEntry(entry, configDir);
    log(`Uploading ${plugin.source} -> ${plugin.dest}`);
    const content = fs.readFileSync(plugin.source, 'utf8');
    const messageId = buildMessageId(null, 'fleet-plugin-upload');
    const payload = {
      messageId,
      path: plugin.dest,
      content,
      overwrite: plugin.overwrite,
    };
    await requestJson(
      buildUrl(server, '/codebase/plugin'),
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      authHeader,
    );
  }
}

function normalizeFleetPluginEntry(entry, configDir) {
  if (typeof entry === 'string') {
    return resolveFleetPlugin({
      source: entry,
      dest: null,
      overwrite: false,
    }, configDir);
  }
  if (!entry || typeof entry !== 'object') {
    throw new Error('Plugin entry must be a string or object.');
  }
  return resolveFleetPlugin({
    source: entry.source ?? entry.path ?? '',
    dest: entry.dest ?? entry.target ?? null,
    overwrite: Boolean(entry.overwrite),
  }, configDir);
}

function resolveFleetPlugin(entry, configDir) {
  const sourceInput = String(entry.source || '').trim();
  if (!sourceInput) {
    throw new Error('Plugin entry missing source.');
  }
  const sourcePath = path.isAbsolute(sourceInput)
    ? sourceInput
    : path.resolve(configDir, sourceInput);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Plugin source not found: ${sourcePath}`);
  }
  const stat = fs.statSync(sourcePath);
  if (!stat.isFile()) {
    throw new Error(`Plugin source is not a file: ${sourcePath}`);
  }

  const dest = entry.dest ? String(entry.dest) : inferPluginPath(sourcePath);
  if (!dest) {
    throw new Error(`Unable to infer plugin destination for ${sourcePath}. Provide dest.`);
  }
  if (!dest.startsWith('plugins/')) {
    throw new Error(`Plugin destination must start with plugins/: ${dest}`);
  }

  return {
    source: sourcePath,
    dest,
    overwrite: Boolean(entry.overwrite),
  };
}

function logFleetInjectResponse({ log, kind, descriptor, response }) {
  const status = response?.data?.status ?? 'unknown';
  const messageId = response?.data?.messageId ?? 'unknown';
  const systemId = response?.data?.systemId ?? null;
  const detail = response?.data?.detail ?? null;
  const parts = [
    `Inject ${kind} response`,
    `status=${status}`,
    `messageId=${messageId}`,
  ];
  if (systemId) {
    parts.push(`systemId=${systemId}`);
  }
  if (detail) {
    parts.push(`detail=${detail}`);
  }
  parts.push(`player=${descriptor.player}`);
  parts.push(`module=${descriptor.modulePath}`);
  log(parts.join(' '));
}

async function injectFleetComponents({ components, server, authHeader, log }) {
  for (const entry of components) {
    const component = normalizeFleetInjectEntry(entry, 'component');
    log(`Inject component ${component.modulePath} (${component.player})`);
    const payload = {
      messageId: buildMessageId(null, 'fleet-component-inject'),
      component: {
        modulePath: component.modulePath,
        exportName: component.exportName || undefined,
      },
    };
    try {
      const response = await requestJsonWithStatus(
        buildUrl(server, `/${component.player}/component`),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
        authHeader,
      );
      logFleetInjectResponse({
        log,
        kind: 'component',
        descriptor: component,
        response,
      });
      if (response.data?.status === 'error') {
        throw new Error(response.data?.detail || 'Component injection failed.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`Component injection error: ${message}`);
      throw error;
    }
  }
}

async function injectFleetSystems({ systems, server, authHeader, log }) {
  for (const entry of systems) {
    const system = normalizeFleetInjectEntry(entry, 'system');
    log(`Inject system ${system.modulePath} (${system.player})`);
    const payload = {
      messageId: buildMessageId(null, 'fleet-system-inject'),
      system: {
        modulePath: system.modulePath,
        exportName: system.exportName || undefined,
      },
    };
    try {
      const response = await requestJsonWithStatus(
        buildUrl(server, `/${system.player}/system`),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
        authHeader,
      );
      logFleetInjectResponse({
        log,
        kind: 'system',
        descriptor: system,
        response,
      });
      if (response.data?.status === 'error') {
        throw new Error(response.data?.detail || 'System injection failed.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`System injection error: ${message}`);
      throw error;
    }
  }
}

async function logFleetStatusAfterInjection({ server, authHeader, deployment, log }) {
  try {
    const response = await requestJsonWithStatus(
      buildUrl(server, '/status'),
      { method: 'GET' },
      authHeader,
    );
    if (!response?.data || typeof response.data !== 'object') {
      log('Status after inject: unexpected response.');
      return;
    }
    const simulation = response.data.simulation ?? {};
    const evaluation = response.data.evaluation ?? {};
    log(
      `Status after inject: simulation state=${simulation.state ?? 'unknown'} tick=${simulation.tick ?? 'n/a'} systems=${simulation.systemCount ?? 'n/a'}; ` +
      `evaluation state=${evaluation.state ?? 'unknown'} tick=${evaluation.tick ?? 'n/a'} systems=${evaluation.systemCount ?? 'n/a'}`,
    );

    const systems = Array.isArray(deployment.systems) ? deployment.systems : [];
    const expectedSim = systems.filter((entry) => normalizePlayer(entry.player) === 'simulation').length;
    const expectedEval = systems.filter((entry) => normalizePlayer(entry.player) === 'evaluation').length;
    if (expectedSim > 0 && (!Number.isFinite(simulation.systemCount) || simulation.systemCount < expectedSim)) {
      log(`Warning: simulation systemCount=${simulation.systemCount ?? 'n/a'} after injecting ${expectedSim} system(s).`);
    }
    if (expectedEval > 0 && (!Number.isFinite(evaluation.systemCount) || evaluation.systemCount < expectedEval)) {
      log(`Warning: evaluation systemCount=${evaluation.systemCount ?? 'n/a'} after injecting ${expectedEval} system(s).`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Status after inject failed: ${message}`);
  }
}

function normalizeFleetInjectEntry(entry, label) {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`${label} entry must be an object.`);
  }
  const modulePath = String(entry.module || entry.path || entry.modulePath || '').trim();
  if (!modulePath) {
    throw new Error(`${label} entry missing module path.`);
  }
  if (!modulePath.startsWith('plugins/')) {
    throw new Error(`${label} modulePath must start with plugins/: ${modulePath}`);
  }
  return {
    player: normalizePlayer(entry.player),
    modulePath,
    exportName: entry.export ?? entry.exportName ?? null,
  };
}

async function prepareFleetCaptures({
  captures,
  configDir,
  deploymentName,
  instanceIndex,
  instance,
  runId,
  defaultUiUrl,
  defaultPollSeconds,
  log,
}) {
  const plans = [];
  const instanceName = instance?.name || `${deploymentName}-${instanceIndex + 1}`;
  const tokens = buildFleetTemplateTokens({
    deploymentName,
    instanceName,
    instanceIndex,
    instanceId: instance?.id ?? null,
    runId,
  });

  for (const capture of captures) {
    const plan = normalizeFleetCapturePlan({
      capture,
      configDir,
      tokens,
      instanceIndex,
      defaultUiUrl,
      defaultPollSeconds,
    });

    if (plan.adjustedPath) {
      log(`Adjusted capture output to ${plan.outputPath}`);
    }

    ensureCaptureFile(plan.outputPath);

    if (plan.ui) {
      log(`Connecting UI (${plan.ui.captureId}) -> ${plan.outputPath}`);
      await startUiLiveStream({
        uiUrl: plan.ui.url,
        source: plan.outputPath,
        captureId: plan.ui.captureId,
        filename: plan.ui.filename,
        pollIntervalMs: plan.ui.pollIntervalMs,
      });
    }

    plans.push(plan);
  }

  return plans;
}

function normalizeFleetCapturePlan({
  capture,
  configDir,
  tokens,
  instanceIndex,
  defaultUiUrl,
  defaultPollSeconds,
}) {
  if (!capture || typeof capture !== 'object') {
    throw new Error('Capture entry must be an object.');
  }

  const stream = String(capture.stream || '').trim();
  if (!stream) {
    throw new Error('Capture entry missing stream.');
  }

  const outTemplate = String(capture.out || '').trim();
  if (!outTemplate) {
    throw new Error('Capture entry missing out path.');
  }

  const renderedOut = renderFleetTemplate(outTemplate, tokens);
  const originalOutputPath = path.isAbsolute(renderedOut)
    ? renderedOut
    : path.resolve(configDir, renderedOut);
  let outputPath = originalOutputPath;
  let adjustedPath = false;
  if (instanceIndex > 0 && !usesFleetInstanceToken(outTemplate)) {
    outputPath = appendInstanceSuffix(outputPath, instanceIndex + 1);
    adjustedPath = true;
  }

  const format = String(capture.format || inferCaptureFormat(outputPath)).toLowerCase();
  if (format !== 'jsonl' && format !== 'json') {
    throw new Error(`Invalid capture format: ${format}`);
  }

  const maxFrames = capture.frames ? coercePositiveInt(capture.frames, 'frames') : null;
  const durationMs = capture.durationMs ?? capture.duration ?? null;
  const durationSeconds = capture.durationSeconds ?? capture.durationSec ?? null;
  const resolvedDurationMs = durationMs
    ? coercePositiveNumber(durationMs, 'durationMs')
    : durationSeconds
      ? coercePositiveNumber(durationSeconds, 'durationSeconds') * 1000
      : null;
  if (!maxFrames && !resolvedDurationMs) {
    throw new Error(`Capture ${stream} requires frames or duration.`);
  }

  const componentId = capture.component ? String(capture.component) : '';
  const entityId = capture.entity ? String(capture.entity) : '';
  const includeAcks = parseBooleanOption(capture.includeAcks, false);

  let ui = null;
  const wantsUi = capture.ui !== false;
  if (wantsUi && !defaultUiUrl && capture.ui) {
    throw new Error('Capture UI configured but no ui url available.');
  }
  if (wantsUi && defaultUiUrl) {
    const uiConfig = typeof capture.ui === 'object' && capture.ui ? capture.ui : {};
    const captureIdRaw =
      uiConfig.captureId ||
      uiConfig.id ||
      `${tokens.instance}-${stream}`;
    let captureId = renderFleetTemplate(String(captureIdRaw), tokens);
    if (instanceIndex > 0 && !usesFleetInstanceToken(String(captureIdRaw))) {
      captureId = `${captureId}-${instanceIndex + 1}`;
    }
    const filenameRaw = uiConfig.filename || path.basename(outputPath);
    const filename = renderFleetTemplate(String(filenameRaw), tokens);
    const pollSeconds = uiConfig.pollSeconds ?? defaultPollSeconds ?? 2;
    ui = {
      url: defaultUiUrl,
      captureId,
      filename,
      pollIntervalMs: Math.round(normalizePollSeconds(pollSeconds) * 1000),
    };
  }

  return {
    stream,
    outputPath,
    originalOutputPath,
    adjustedPath,
    format,
    maxFrames,
    durationMs: resolvedDurationMs,
    componentId,
    entityId,
    includeAcks,
    ui,
  };
}

function inferCaptureFormat(outputPath) {
  return outputPath.toLowerCase().endsWith('.json') ? 'json' : 'jsonl';
}

function renderFleetTemplate(value, tokens) {
  return String(value).replace(/\$\{(\w+)\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(tokens, key)) {
      return tokens[key];
    }
    return '';
  });
}

function renderFleetMetadataEntries(entries, tokens, label) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }
  return entries
    .map((entry) => renderFleetTemplate(entry, tokens).trim())
    .filter(Boolean)
    .map((entry) => {
      if (!entry.includes('=')) {
        throw new Error(`Invalid ${label} entry (expected key=value): ${entry}`);
      }
      return entry;
    });
}

function usesFleetInstanceToken(value) {
  return /\$\{(index|instance|instanceId)\}/.test(String(value));
}

function appendInstanceSuffix(filePath, index) {
  const ext = path.extname(filePath);
  const base = ext ? filePath.slice(0, -ext.length) : filePath;
  return `${base}-${index}${ext}`;
}

function ensureCaptureFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const fd = fs.openSync(filePath, 'a');
  fs.closeSync(fd);
}

async function startUiLiveStream({ uiUrl, source, captureId, filename, pollIntervalMs }) {
  const socket = await connectWebSocket(uiUrl);
  let socketClosed = false;
  socket.addEventListener('close', () => {
    socketClosed = true;
  });
  sendWsMessage(socket, { type: 'register', role: 'agent' });
  const registered = await waitForWsAck(socket);
  if (!registered) {
    socket.close();
    throw new Error('Failed to register with the UI WebSocket.');
  }

  const requestId = buildMessageId(null, `ui-live-${captureId}`);
  sendWsMessage(socket, {
    type: 'live_start',
    source,
    captureId,
    filename,
    pollIntervalMs,
    request_id: requestId,
  });
  const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs: 4000 });
  if (!ack) {
    if (!socketClosed) {
      socket.close();
    }
    throw new Error('Timed out waiting for UI ack.');
  }
  if (!socketClosed) {
    socket.close();
  }
}

async function runFleetCapturesParallel({ plans, server, authHeader, log }) {
  return Promise.all(plans.map((plan) => runFleetCapture({ plan, server, authHeader, log })));
}

async function runFleetCapturesSequential({ plans, server, authHeader, log }) {
  const summaries = [];
  for (const plan of plans) {
    summaries.push(await runFleetCapture({ plan, server, authHeader, log }));
  }
  return summaries;
}

async function runFleetCapture({ plan, server, authHeader, log }) {
  const streamPath = resolveStreamPath(plan.stream);
  const url = streamPath.startsWith('http://') || streamPath.startsWith('https://')
    ? streamPath
    : buildUrl(server, streamPath);

  log(`Capturing ${plan.stream} -> ${plan.outputPath}`);
  const summary = await captureStream({
    url,
    outputPath: plan.outputPath,
    format: plan.format,
    maxFrames: plan.maxFrames,
    durationMs: plan.durationMs,
    componentId: plan.componentId,
    entityId: plan.entityId,
    includeAcks: plan.includeAcks,
    authHeader,
  });

  log(`Captured ${summary.recordCount} records (${summary.frameCount} frames)`);
  return {
    stream: plan.stream,
    outputPath: summary.outputPath,
    recordCount: summary.recordCount,
    frameCount: summary.frameCount,
    ackCount: summary.ackCount,
    durationMs: summary.durationMs,
  };
}

async function runFleetPlayback({ action, server, authHeader, log }) {
  const messageId = buildMessageId(null, `fleet-${action}`);
  log(`Playback ${action}`);
  await requestJson(
    buildUrl(server, `/simulation/${action}`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    },
    authHeader,
  );
}

async function applyFleetInstanceMetadata({ instanceId, labels, log }) {
  if (!instanceId || labels.length === 0) {
    return;
  }
  const args = ['instance', 'set-metadata', instanceId];
  for (const label of labels) {
    args.push('--metadata', label);
  }
  log(`Label instance (${labels.length} entries)`);
  const result = await runCommandCapture('morphcloud', args, {
    prefix: `[label:${instanceId}] `,
  });
  if (result.code !== 0) {
    throw new Error(`Failed to label instance ${instanceId}`);
  }
}

async function runFleetSnapshot({ instanceId, labels, log }) {
  if (!instanceId) {
    throw new Error('Missing instance id for snapshot.');
  }
  const args = ['instance', 'snapshot', instanceId, '--json'];
  for (const label of labels) {
    args.push('--metadata', label);
  }
  log('Snapshotting instance');
  const result = await runCommandCapture('morphcloud', args, {
    prefix: `[snapshot:${instanceId}] `,
  });
  if (result.code !== 0) {
    throw new Error(`Snapshot failed for ${instanceId}`);
  }
  const parsed = extractJsonFromOutput(result.stdout);
  const snapshotId = parsed?.id ?? parsed?.snapshotId ?? parsed?.snapshot_id ?? null;
  if (!snapshotId) {
    throw new Error(`Snapshot response missing id for ${instanceId}`);
  }
  return {
    id: snapshotId,
    createdAt: parsed?.created_at ?? parsed?.createdAt ?? new Date().toISOString(),
    metadata: labels,
  };
}

async function runFleetStopInstance({ instanceId, log }) {
  if (!instanceId) {
    throw new Error('Missing instance id for stop.');
  }
  log('Stopping instance');
  const result = await runCommandCapture('morphcloud', ['instance', 'stop', instanceId], {
    prefix: `[stop:${instanceId}] `,
  });
  if (result.code !== 0) {
    throw new Error(`Failed to stop instance ${instanceId}`);
  }
  return {
    status: 'stopped',
    stoppedAt: new Date().toISOString(),
  };
}

function recordFleetSnapshotState({ stateFile, instanceId, snapshot, runId }) {
  if (!stateFile || !instanceId || !snapshot) {
    return;
  }
  const state = loadMorphcloudState(stateFile);
  const record = state.instances[instanceId];
  if (!record) {
    return;
  }
  state.instances[instanceId] = {
    ...record,
    snapshotId: snapshot.id ?? null,
    snapshotCreatedAt: snapshot.createdAt ?? new Date().toISOString(),
    snapshotMetadata: snapshot.metadata ?? null,
    lastRunId: runId ?? record.lastRunId ?? null,
  };
  saveMorphcloudState(stateFile, state);
}

function recordFleetStopState({ stateFile, instanceId, forget }) {
  if (!stateFile || !instanceId) {
    return;
  }
  const state = loadMorphcloudState(stateFile);
  const record = state.instances[instanceId];
  if (!record) {
    return;
  }
  if (forget) {
    delete state.instances[instanceId];
  } else {
    state.instances[instanceId] = {
      ...record,
      stoppedAt: new Date().toISOString(),
    };
  }
  saveMorphcloudState(stateFile, state);
}

function wrapShellCommand(command) {
  const escaped = String(command)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
  return `"${escaped}"`;
}

async function runCommandCapture(command, args, { cwd, prefix } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    streamWithPrefix(child.stdout, prefix, (chunk) => {
      stdout += chunk;
    }, process.stdout);
    streamWithPrefix(child.stderr, prefix, (chunk) => {
      stderr += chunk;
    }, process.stderr);

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

function streamWithPrefix(stream, prefix, collector, target) {
  if (!stream) {
    return;
  }

  let buffer = '';
  const appliedPrefix = prefix || '';

  stream.on('data', (chunk) => {
    const text = chunk.toString();
    collector(text);
    buffer += text;

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();

    for (const line of lines) {
      if (!appliedPrefix) {
        target.write(`${line}\n`);
      } else {
        target.write(`${appliedPrefix}${line}\n`);
      }
    }
  });

  stream.on('end', () => {
    if (!buffer) {
      return;
    }
    if (!appliedPrefix) {
      target.write(`${buffer}\n`);
    } else {
      target.write(`${appliedPrefix}${buffer}\n`);
    }
  });
}

function extractJsonFromOutput(output) {
  const trimmed = String(output || '').trim();
  if (!trimmed) {
    return null;
  }

  const indices = [];
  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed[i] === '{') {
      indices.push(i);
    }
  }

  for (let i = indices.length - 1; i >= 0; i -= 1) {
    const slice = trimmed.slice(indices[i]);
    try {
      return JSON.parse(slice);
    } catch {
      // continue
    }
  }

  return null;
}

function buildAuthHeader(token) {
  const trimmed = token ? String(token).trim() : '';
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith('Bearer ') ? trimmed : `Bearer ${trimmed}`;
}

function parseArgs(argvInput) {
  const options = {};
  const positional = [];
  for (let index = 0; index < argvInput.length; index += 1) {
    const arg = argvInput[index];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (!key) {
      continue;
    }
    if (key === 'help' || key === 'h') {
      options.help = true;
      continue;
    }
    const next = argvInput[index + 1];
    if (typeof next === 'undefined' || next.startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return { options, positional };
}

function resolveDeployStateFile(options) {
  const candidate =
    options.state ??
    process.env.SIMEVAL_DEPLOY_STATE ??
    path.join(os.homedir(), '.simeval', 'deployments.json');
  return path.resolve(process.cwd(), String(candidate));
}

function resolveUiStateFile(options) {
  const candidate =
    options['ui-state'] ??
    process.env.SIMEVAL_UI_STATE ??
    path.join(os.homedir(), '.simeval', 'ui.json');
  return path.resolve(process.cwd(), String(candidate));
}

function resolveMorphcloudStateFile(options) {
  const candidate =
    options['morph-state'] ??
    process.env.SIMEVAL_MORPHCLOUD_STATE ??
    path.join(os.homedir(), '.simeval', 'morphcloud.json');
  return path.resolve(process.cwd(), String(candidate));
}

function loadDeployState(stateFile) {
  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    return normalizeDeployState(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return normalizeDeployState({});
    }
    throw error;
  }
}

function saveDeployState(stateFile, state) {
  const normalized = normalizeDeployState(state);
  normalized.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

function normalizeDeployState(state) {
  const deployments =
    state && typeof state === 'object' && state.deployments && typeof state.deployments === 'object'
      ? state.deployments
      : {};
  return {
    deployments,
    updatedAt: state && typeof state === 'object' && typeof state.updatedAt === 'string' ? state.updatedAt : null,
  };
}

function loadUiState(stateFile) {
  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    return normalizeUiState(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return normalizeUiState({});
    }
    throw error;
  }
}

function normalizeUiState(state) {
  const deployments =
    state && typeof state === 'object' && state.deployments && typeof state.deployments === 'object'
      ? state.deployments
      : {};
  return {
    deployments,
    updatedAt: state && typeof state === 'object' && typeof state.updatedAt === 'string' ? state.updatedAt : null,
  };
}

function saveUiState(stateFile, state) {
  const normalized = normalizeUiState(state);
  normalized.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

function loadMorphcloudState(stateFile) {
  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    return normalizeMorphcloudState(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return normalizeMorphcloudState({});
    }
    throw error;
  }
}

function normalizeMorphcloudState(state) {
  const instances =
    state && typeof state === 'object' && state.instances && typeof state.instances === 'object'
      ? state.instances
      : {};
  return {
    instances,
    updatedAt: state && typeof state === 'object' && typeof state.updatedAt === 'string' ? state.updatedAt : null,
  };
}

function saveMorphcloudState(stateFile, state) {
  const normalized = normalizeMorphcloudState(state);
  normalized.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

const BASE_PLUGIN_DIRS = new Set([
  'plugins',
  'plugins/simulation',
  'plugins/simulation/components',
  'plugins/simulation/systems',
  'plugins/simulation/operations',
  'plugins/evaluation',
  'plugins/evaluation/components',
  'plugins/evaluation/systems',
  'plugins/evaluation/operations',
]);

function cleanPluginDirectories(workspaceDir) {
  const pluginsDir = path.join(workspaceDir, 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    return { removedFiles: 0, removedDirs: 0, skippedFiles: 0 };
  }

  const stats = fs.statSync(pluginsDir);
  if (!stats.isDirectory()) {
    return { removedFiles: 0, removedDirs: 0, skippedFiles: 0 };
  }

  const summary = { removedFiles: 0, removedDirs: 0, skippedFiles: 0 };
  cleanDirectoryRecursive(pluginsDir, workspaceDir, summary);
  return summary;
}

function cleanDirectoryRecursive(targetDir, workspaceDir, summary) {
  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  const relative = path.relative(workspaceDir, targetDir).split(path.sep).join('/');
  const isBaseDir = BASE_PLUGIN_DIRS.has(relative);

  for (const entry of entries) {
    const entryPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      cleanDirectoryRecursive(entryPath, workspaceDir, summary);
      const remaining = fs.readdirSync(entryPath);
      const relChild = path.relative(workspaceDir, entryPath).split(path.sep).join('/');
      const childIsBase = BASE_PLUGIN_DIRS.has(relChild);
      if (!childIsBase && remaining.length === 0) {
        fs.rmdirSync(entryPath);
        summary.removedDirs += 1;
      }
      continue;
    }

    if (entry.isFile() && entry.name === '.gitkeep' && isBaseDir) {
      summary.skippedFiles += 1;
      continue;
    }

    fs.unlinkSync(entryPath);
    summary.removedFiles += 1;
  }
}

function resolveWorkspaceDir(options) {
  if (options.workspace) {
    const resolved = path.resolve(process.cwd(), String(options.workspace));
    if (!fs.existsSync(resolved)) {
      throw new Error(`Workspace not found: ${resolved}`);
    }
    return resolved;
  }

  if (CLI_CONFIG?.data?.workspace) {
    const resolved = path.resolve(CLI_CONFIG.dir ?? process.cwd(), String(CLI_CONFIG.data.workspace));
    if (!fs.existsSync(resolved)) {
      throw new Error(`Workspace not found: ${resolved}`);
    }
    return resolved;
  }

  if (process.env.SIMEVAL_WORKSPACE) {
    const resolved = path.resolve(process.cwd(), String(process.env.SIMEVAL_WORKSPACE));
    if (!fs.existsSync(resolved)) {
      throw new Error(`Workspace not found: ${resolved}`);
    }
    return resolved;
  }

  const resolved = path.resolve(__dirname, '..', '..', 'workspaces', 'Describing_Simulation_0');
  if (!fs.existsSync(resolved)) {
    throw new Error(`Workspace not found: ${resolved}`);
  }
  return resolved;
}

function resolveDeployHost(options) {
  return String(options.host ?? process.env.SIMEVAL_HOST ?? '127.0.0.1');
}

function resolveLogDir(options) {
  const candidate = options['log-dir'] ?? process.env.SIMEVAL_LOG_DIR ?? path.join(os.homedir(), '.simeval', 'logs');
  return path.resolve(process.cwd(), String(candidate));
}

function resolveCliLogDir(options) {
  const candidate =
    options['log-dir'] ??
    process.env.SIMEVAL_CLI_LOG_DIR ??
    path.join(os.homedir(), '.simeval', 'logs', 'cli');
  return path.resolve(process.cwd(), String(candidate));
}

function resolveCliLogFile(options, type) {
  if (options.log) {
    return path.resolve(process.cwd(), String(options.log));
  }
  const logDir = resolveCliLogDir(options);
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
  return path.join(logDir, `${type}_${timestamp}.log`);
}

function spawnDetachedProcess({ command, args, cwd, env, logFile }) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const logFd = fs.openSync(logFile, 'a');
  const child = spawn(command, args, {
    cwd,
    env,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  fs.closeSync(logFd);
  if (!child.pid) {
    throw new Error('Failed to spawn background process.');
  }
  return child.pid;
}

function resolveLogFile(options, logDir, port) {
  if (options.log) {
    return path.resolve(process.cwd(), String(options.log));
  }
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
  return path.join(logDir, `simeval_${port}_${timestamp}.log`);
}

function resolveBuildMode(options) {
  if (options['no-build']) {
    return 'never';
  }
  if (options.build) {
    return 'always';
  }
  return 'always';
}

function resolveAutoStartEvaluation(options) {
  if (options['no-auto-start-eval']) {
    return false;
  }
  return parseBooleanOption(options['auto-start-eval'], true);
}

function buildStreamForwardArgs({ options, streamInput, uiUrl }) {
  const args = [__filename, 'stream', 'forward', '--foreground'];
  const streamValue = options.stream || streamInput;
  if (streamValue) {
    args.push('--stream', String(streamValue));
  }
  if (options.frames) {
    args.push('--frames', String(options.frames));
  }
  if (options.duration) {
    args.push('--duration', String(options.duration));
  }
  if (options.component) {
    args.push('--component', String(options.component));
  }
  if (options.entity) {
    args.push('--entity', String(options.entity));
  }
  if (options['capture-id']) {
    args.push('--capture-id', String(options['capture-id']));
  }
  if (options.filename || options.name) {
    args.push('--filename', String(options.filename || options.name));
  }
  if (options.server) {
    args.push('--server', String(options.server));
  }
  if (options.token) {
    args.push('--token', String(options.token));
  }
  args.push('--ui', String(uiUrl));
  return args;
}

function listCliLogs(logDir, typeFilter) {
  if (!fs.existsSync(logDir)) {
    return [];
  }
  const entries = fs.readdirSync(logDir)
    .filter((entry) => entry.endsWith('.log'))
    .filter((entry) => (typeFilter ? entry.startsWith(`${typeFilter}_`) : true))
    .map((entry) => {
      const fullPath = path.join(logDir, entry);
      const stat = fs.statSync(fullPath);
      return {
        name: entry,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1));
  return entries;
}

function resolveCliLogTarget(logDir, target, typeFilter) {
  const resolved = path.isAbsolute(target) ? target : path.join(logDir, target);
  if (fs.existsSync(resolved)) {
    return resolved;
  }
  const prefix = typeFilter ? `${typeFilter}_${target}` : target;
  const matches = fs.existsSync(logDir)
    ? fs.readdirSync(logDir).filter((entry) => entry.startsWith(prefix))
    : [];
  if (matches.length === 0) {
    throw new Error(`Log not found: ${target}`);
  }
  if (matches.length > 1) {
    throw new Error(`Multiple logs match: ${matches.join(', ')}`);
  }
  return path.join(logDir, matches[0]);
}

function parseBooleanOption(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (value === true) {
    return true;
  }
  if (value === false) {
    return false;
  }
  const normalized = String(value).toLowerCase().trim();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

async function deployStart(options) {
  const port = parseOptionalNumber(options.port, 'port') ?? 3000;
  const host = resolveDeployHost(options);
  const workspace = resolveWorkspaceDir(options);
  const distMain = path.join(workspace, 'dist', 'main.js');
  const buildMode = resolveBuildMode(options);
  const autoStartEvaluation = resolveAutoStartEvaluation(options);
  const logDir = resolveLogDir(options);
  const logFile = resolveLogFile(options, logDir, port);
  const stateFile = resolveDeployStateFile(options);
  const state = loadDeployState(stateFile);
  const cleanPlugins = Boolean(options['clean-plugins']);
  const waitForReady = parseBooleanOption(options.wait, false);
  const waitTimeoutMs = parseOptionalNumber(options['wait-timeout'], 'wait-timeout') ?? 30000;
  const waitIntervalMs = parseOptionalNumber(options['wait-interval'], 'wait-interval') ?? 500;

  if (state.deployments[String(port)] && isProcessAlive(state.deployments[String(port)].pid)) {
    if (!options.force) {
      throw new Error(`Port ${port} already has a running deployment. Use --force to replace.`);
    }
  }

  delete state.deployments[String(port)];

  await ensureBuild(buildMode, workspace, distMain);

  const cleanSummary = cleanPlugins ? cleanPluginDirectories(workspace) : null;

  const env = {
    ...process.env,
    SIMEVAL_PORT: String(port),
    SIMEVAL_HOST: host,
    SIMEVAL_AUTO_START_EVALUATION: autoStartEvaluation ? 'true' : 'false',
  };

  const pid = spawnServer(distMain, workspace, env, logFile);
  const record = {
    pid,
    host,
    port,
    workspace,
    logFile,
    startedAt: new Date().toISOString(),
  };

  state.deployments[String(port)] = record;
  saveDeployState(stateFile, state);

  if (waitForReady) {
    await waitForDeployReady({
      pid,
      host,
      port,
      timeoutMs: waitTimeoutMs,
      intervalMs: waitIntervalMs,
    });
  }

  printJson({
    status: 'started',
    ...record,
    cleanPlugins: cleanSummary,
    stateFile,
  });
}

async function deployStop(options) {
  const stateFile = resolveDeployStateFile(options);
  const state = loadDeployState(stateFile);
  const signal = typeof options.signal === 'string' ? options.signal : 'SIGTERM';
  const timeoutMs = parseOptionalNumber(options.timeout, 'timeout') ?? 5000;
  const results = [];

  if (options.all) {
    for (const [key, record] of Object.entries(state.deployments)) {
      const result = await stopDeployment(record, signal, timeoutMs);
      results.push(result);
      delete state.deployments[key];
    }
  } else if (options.pid) {
    const pid = parseOptionalNumber(options.pid, 'pid');
    if (!pid) {
      throw new Error('Missing --pid for deploy stop.');
    }
    const matchKey = Object.keys(state.deployments).find(
      (key) => Number(state.deployments[key]?.pid) === pid,
    );
    const record = matchKey ? state.deployments[matchKey] : { pid };
    results.push(await stopDeployment(record, signal, timeoutMs));
    if (matchKey) {
      delete state.deployments[matchKey];
    }
  } else {
    const port = parseOptionalNumber(options.port, 'port');
    if (!port) {
      throw new Error('Missing --port for deploy stop.');
    }
    const record = state.deployments[String(port)];
    if (!record) {
      throw new Error(`No deployment recorded for port ${port}.`);
    }
    results.push(await stopDeployment(record, signal, timeoutMs));
    delete state.deployments[String(port)];
  }

  saveDeployState(stateFile, state);
  printJson({
    status: 'stopped',
    stateFile,
    results,
  });
}

function deployList(options) {
  const stateFile = resolveDeployStateFile(options);
  const state = loadDeployState(stateFile);
  const deployments = Object.values(state.deployments).sort((a, b) => {
    const aPort = Number(a.port ?? 0);
    const bPort = Number(b.port ?? 0);
    return aPort - bPort;
  });
  printJson({
    stateFile,
    deployments,
  });
}

function spawnServer(entrypoint, workspace, env, logFile) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const logFd = fs.openSync(logFile, 'a');
  const child = spawn('node', [entrypoint], {
    cwd: workspace,
    env,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  fs.closeSync(logFd);
  if (!child.pid) {
    throw new Error('Failed to start SimEval process.');
  }
  return child.pid;
}

async function waitForDeployReady({ pid, host, port, timeoutMs, intervalMs }) {
  const url = buildUrl(resolveDeployHealthHost(host, port), '/health');
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      throw new Error('Deploy process exited before health check passed.');
    }
    try {
      await requestJson(url, { method: 'GET' });
      return;
    } catch (error) {
      lastError = error;
    }
    await delay(intervalMs);
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Timed out waiting for deployment health check: ${message}`);
}

function resolveDeployHealthHost(host, port) {
  const normalizedHost = String(host || '').trim();
  const resolvedHost = normalizedHost === '0.0.0.0' ? '127.0.0.1' : normalizedHost;
  return `http://${resolvedHost}:${port}/api`;
}

async function ensureBuild(mode, workspace, distMain) {
  const exists = fs.existsSync(distMain);
  if (mode === 'never') {
    if (!exists) {
      throw new Error('dist/main.js not found. Run a build or omit --no-build.');
    }
    return;
  }
  if (mode === 'auto' && exists) {
    return;
  }
  await runCommand('npm', ['--prefix', workspace, 'run', 'build'], { cwd: workspace });
  if (!fs.existsSync(distMain)) {
    throw new Error('Build completed but dist/main.js is still missing.');
  }
}

async function runCommand(command, args, options) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
      }
    });
  });
}

async function stopDeployment(record, signal, timeoutMs) {
  const pid = Number(record?.pid);
  if (!Number.isFinite(pid)) {
    return { status: 'missing-pid', pid: null, record };
  }

  if (!isProcessAlive(pid)) {
    return { status: 'not-running', pid, record };
  }

  try {
    process.kill(pid, signal);
  } catch (error) {
    if (error && error.code !== 'ESRCH') {
      throw error;
    }
  }

  let stopped = await waitForExit(pid, timeoutMs);
  if (!stopped && signal !== 'SIGKILL') {
    try {
      process.kill(pid, 'SIGKILL');
    } catch (error) {
      if (error && error.code !== 'ESRCH') {
        throw error;
      }
    }
    stopped = await waitForExit(pid, 1000);
  }

  return { status: stopped ? 'stopped' : 'signal-sent', pid, record };
}

function isProcessAlive(pid) {
  if (!Number.isFinite(pid)) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && error.code === 'ESRCH') {
      return false;
    }
    if (error && error.code === 'EPERM') {
      return true;
    }
    return false;
  }
}

async function waitForExit(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      return true;
    }
    await delay(100);
  }
  return !isProcessAlive(pid);
}

function resolveServerUrl(options, runContext) {
  const candidate =
    (options.server ??
      runContext?.data?.server ??
      CLI_CONFIG?.data?.server ??
      process.env.SIMEVAL_SERVER_URL ??
      process.env.SIMEVAL_BASE_URL ??
      'http://127.0.0.1:3000/api') || '';
  const trimmed = String(candidate).trim();
  if (!trimmed) {
    throw new Error('Missing server URL. Pass --server or set SIMEVAL_SERVER_URL.');
  }
  return trimmed.replace(/\/+$/, '');
}

function resolveAuthHeader(options) {
  const raw =
    options.token ??
    CLI_CONFIG?.data?.token ??
    process.env.SIMEVAL_AUTH_TOKEN ??
    process.env.SIMEVAL_API_TOKEN ??
    '';
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith('Bearer ') ? trimmed : `Bearer ${trimmed}`;
}

function resolveUiServeOptions(options) {
  const host =
    String(
      options['ui-host'] ??
        options.host ??
        CLI_CONFIG?.data?.uiHost ??
        DEFAULT_UI_HOST,
    ).trim() || DEFAULT_UI_HOST;
  const port =
    parseOptionalNumber(
      options['ui-port'] ?? options.port ?? CLI_CONFIG?.data?.uiPort,
      'ui-port',
    ) ?? DEFAULT_UI_PORT;
  const mode = normalizeUiServeMode(
    options['ui-mode'] ?? CLI_CONFIG?.data?.uiMode ?? 'dev',
  );
  const uiDir = resolveUiDirectory(options['ui-dir'], CLI_CONFIG?.data?.uiDir);
  const timeoutMs = parseOptionalNumber(options.timeout, 'timeout') ?? 5000;
  const skipInstall = Boolean(options['skip-install'] ?? options['no-install']);

  return {
    host,
    port,
    mode,
    uiDir,
    timeoutMs,
    skipInstall,
  };
}

function resolveUiShutdownUrl(options) {
  const uiInput = resolveUiInput(options, 'ui shutdown');
  if (uiInput) {
    const httpUrl = normalizeUiHttpUrl(uiInput);
    if (!httpUrl) {
      throw new Error('Invalid --ui value. Provide a ws:// or http(s):// URL.');
    }
    return httpUrl;
  }
  const host =
    String(
      options['ui-host'] ??
        options.host ??
        CLI_CONFIG?.data?.uiHost ??
        DEFAULT_UI_HOST,
    ).trim() || DEFAULT_UI_HOST;
  const port =
    parseOptionalNumber(
      options['ui-port'] ?? options.port ?? CLI_CONFIG?.data?.uiPort,
      'ui-port',
    ) ?? DEFAULT_UI_PORT;
  return `http://${host}:${port}`;
}

function resolveUiInput(options, contextLabel = 'ui') {
  const explicit =
    options.ui ||
    options.ws ||
    options['ui-url'] ||
    options['ws-url'];
  if (explicit) {
    return explicit;
  }
  if (CLI_CONFIG?.data?.uiUrl) {
    console.log(`[ui] using default ui url (${contextLabel}): ${CLI_CONFIG.data.uiUrl}`);
    return CLI_CONFIG.data.uiUrl;
  }
  if (CLI_CONFIG?.data?.uiHost || CLI_CONFIG?.data?.uiPort) {
    const host = String(CLI_CONFIG?.data?.uiHost ?? DEFAULT_UI_HOST).trim() || DEFAULT_UI_HOST;
    const port =
      parseOptionalNumber(CLI_CONFIG?.data?.uiPort, 'ui-port') ?? DEFAULT_UI_PORT;
    console.log(`[ui] using default ui host/port (${contextLabel}): ${host}:${port}`);
    return `http://${host}:${port}`;
  }
  return '';
}

function resolveUiStatusTarget(options) {
  const explicit =
    options.ui ||
    options.ws ||
    options['ui-url'] ||
    options['ws-url'];
  if (explicit) {
    return {
      input: explicit,
      url: normalizeUiHttpUrl(explicit),
      source: 'explicit',
    };
  }

  const hostInput = options['ui-host'] ?? options.host;
  const portInput = options['ui-port'] ?? options.port;
  if (hostInput || portInput) {
    const host = String(hostInput ?? DEFAULT_UI_HOST).trim() || DEFAULT_UI_HOST;
    const port = parseOptionalNumber(portInput, 'ui-port') ?? DEFAULT_UI_PORT;
    return {
      input: `${host}:${port}`,
      url: `http://${host}:${port}`,
      source: 'host-port',
    };
  }

  if (CLI_CONFIG?.data?.uiUrl) {
    console.log(`[ui] using default ui url (status): ${CLI_CONFIG.data.uiUrl}`);
    return {
      input: CLI_CONFIG.data.uiUrl,
      url: normalizeUiHttpUrl(CLI_CONFIG.data.uiUrl),
      source: 'config',
    };
  }

  if (CLI_CONFIG?.data?.uiHost || CLI_CONFIG?.data?.uiPort) {
    const host = String(CLI_CONFIG?.data?.uiHost ?? DEFAULT_UI_HOST).trim() || DEFAULT_UI_HOST;
    const port =
      parseOptionalNumber(CLI_CONFIG?.data?.uiPort, 'ui-port') ?? DEFAULT_UI_PORT;
    console.log(`[ui] using default ui host/port (status): ${host}:${port}`);
    return {
      input: `${host}:${port}`,
      url: `http://${host}:${port}`,
      source: 'config-host-port',
    };
  }

  console.log(`[ui] using default ui host/port (status): ${DEFAULT_UI_HOST}:${DEFAULT_UI_PORT}`);
  return {
    input: `${DEFAULT_UI_HOST}:${DEFAULT_UI_PORT}`,
    url: `http://${DEFAULT_UI_HOST}:${DEFAULT_UI_PORT}`,
    source: 'default',
  };
}

function buildUiKey(host, port) {
  const normalizedHost = String(host ?? '').trim() || DEFAULT_UI_HOST;
  const normalizedPort = String(port ?? '').trim();
  if (!normalizedPort) {
    return null;
  }
  return `${normalizedHost}:${normalizedPort}`;
}

function buildUiKeyFromUrl(url) {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (!parsed.port) {
      return null;
    }
    return `${parsed.hostname}:${parsed.port}`;
  } catch (_error) {
    return null;
  }
}

function resolveUiDirectory(explicitDir, configDir) {
  if (explicitDir) {
    const resolved = path.resolve(process.cwd(), String(explicitDir));
    return assertUiDirectory(resolved, '--ui-dir');
  }
  if (configDir) {
    const resolved = path.resolve(process.cwd(), String(configDir));
    return assertUiDirectory(resolved, 'uiDir');
  }
  const defaultDir = path.resolve(process.cwd(), DEFAULT_UI_DIRNAME);
  return assertUiDirectory(defaultDir, DEFAULT_UI_DIRNAME);
}

function assertUiDirectory(candidate, sourceLabel) {
  if (!fs.existsSync(candidate)) {
    throw new Error(
      `Metrics UI directory not found (${sourceLabel}: ${candidate}). ` +
        'Pass --ui-dir or set uiDir in ~/.simeval/config.json.',
    );
  }
  const stats = fs.statSync(candidate);
  if (!stats.isDirectory()) {
    throw new Error(`Metrics UI path is not a directory (${candidate}).`);
  }
  const packageJson = path.join(candidate, 'package.json');
  if (!fs.existsSync(packageJson)) {
    throw new Error(`Metrics UI package.json missing at ${packageJson}.`);
  }
  return candidate;
}

async function ensureUiDependencies(uiDir, skipInstall) {
  const nodeModules = path.join(uiDir, 'node_modules');
  if (fs.existsSync(nodeModules)) {
    return;
  }
  if (skipInstall) {
    throw new Error(`Missing node_modules in ${uiDir}. Run npm install or omit --skip-install.`);
  }
  console.log(`[ui] installing dependencies in ${uiDir}`);
  await runCommand('npm', ['--prefix', uiDir, 'install'], { cwd: uiDir });
}

async function probeUiServer({ host, port, timeoutMs }) {
  const url = `http://${host}:${port}/`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    const wsHeader = response.headers.get('x-metrics-ui-agent-ws');
    return {
      running: true,
      isUi: Boolean(wsHeader),
      url,
    };
  } catch (error) {
    return {
      running: false,
      isUi: false,
      url,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeUiHttpUrl(url, timeoutMs) {
  if (!url) {
    return {
      running: false,
      isUi: false,
      url: null,
      error: 'UI url missing.',
    };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    const wsHeader = response.headers.get('x-metrics-ui-agent-ws');
    return {
      running: true,
      isUi: Boolean(wsHeader),
      url,
      wsHeader: wsHeader || null,
    };
  } catch (error) {
    return {
      running: false,
      isUi: false,
      url,
      error: error?.message ?? String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeUiServeMode(value) {
  const normalized = String(value || 'dev').toLowerCase();
  if (normalized === 'dev' || normalized === 'development') {
    return 'dev';
  }
  if (normalized === 'start' || normalized === 'prod' || normalized === 'production') {
    return 'start';
  }
  throw new Error('Invalid --ui-mode value. Use dev or start.');
}

function readCliConfigFile(configPath) {
  if (!fs.existsSync(configPath)) {
    return { data: {}, exists: false };
  }

  let raw;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read CLI config: ${configPath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse CLI config JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('CLI config must be a JSON object.');
  }

  return { data: parsed, exists: true };
}

function redactCliConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return config;
  }

  const redacted = { ...config };
  ['token', 'authToken', 'apiToken', 'morphApiKey'].forEach((key) => {
    if (redacted[key]) {
      redacted[key] = '<redacted>';
    }
  });
  return redacted;
}

function readConfigOption(options, key, label) {
  if (!Object.prototype.hasOwnProperty.call(options, key)) {
    return null;
  }
  const value = options[key];
  if (value === true) {
    throw new Error(`Missing value for ${label}.`);
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    throw new Error(`Missing value for ${label}.`);
  }
  return trimmed;
}

function buildUrl(server, endpointPath) {
  if (!endpointPath) {
    return server;
  }
  if (endpointPath.startsWith('http://') || endpointPath.startsWith('https://')) {
    return endpointPath;
  }
  const normalized = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return `${server}${normalized}`;
}

async function safeRequestJson(url, authHeader, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      url,
      applyAuth({ method: 'GET', signal: controller.signal }, authHeader),
    );
    const text = await response.text().catch(() => '');
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: text || `Request failed (${response.status})`,
      };
    }
    if (!text) {
      return { ok: true, status: response.status, data: null };
    }
    try {
      return { ok: true, status: response.status, data: JSON.parse(text) };
    } catch (error) {
      return {
        ok: false,
        status: response.status,
        error: `Invalid JSON response: ${error?.message ?? error}`,
      };
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: error?.name === 'AbortError' ? 'Request timed out' : error?.message ?? String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function requestJson(url, init, authHeader) {
  const response = await fetch(url, applyAuth(init ?? {}, authHeader));
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  return response.json();
}

async function requestJsonWithStatus(url, init, authHeader) {
  const response = await fetch(url, applyAuth(init ?? {}, authHeader));
  const text = await response.text().catch(() => '');
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = text;
    }
  }
  if (!response.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(`Request failed (${response.status}): ${detail}`);
  }
  return { status: response.status, data };
}

function applyAuth(init, authHeader) {
  if (!authHeader) {
    return init;
  }
  const headers = { ...(init.headers ?? {}), Authorization: authHeader };
  return { ...init, headers };
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function normalizePlayer(value) {
  const normalized = String(value || 'simulation').toLowerCase();
  if (normalized === 'evaluation' || normalized === 'eval') {
    return 'evaluation';
  }
  return 'simulation';
}

function resolveStreamPath(stream) {
  const normalized = String(stream || '').toLowerCase();
  if (!normalized || normalized === 'simulation' || normalized === 'sim') {
    return '/simulation/stream';
  }
  if (normalized === 'evaluation' || normalized === 'eval') {
    return '/evaluation/stream';
  }
  if (normalized.startsWith('/')) {
    return normalized;
  }
  return `/${normalized}`;
}

function parseOptionalNumber(value, label) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid --${label} value. Expected a positive number.`);
  }
  return parsed;
}

function parsePathInput(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  if (raw.startsWith('[')) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid --path JSON. Expected an array.');
    }
    return parsed.map((segment) => String(segment));
  }
  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return raw
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildMessageId(runId, suffix) {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
  const prefix = runId ? `${runId}` : 'cli';
  return `${prefix}-${suffix}-${timestamp}`;
}

function buildRunId() {
  return `run-${new Date().toISOString().replace(/[-:.]/g, '')}`;
}

function buildCaptureId() {
  return `capture-${new Date().toISOString().replace(/[-:.]/g, '')}`;
}

function resolveRunsRoot(options) {
  const candidate = options['runs-dir'] ?? process.env.SIMEVAL_RUNS_DIR ?? path.join(process.cwd(), 'runs');
  return path.resolve(process.cwd(), String(candidate));
}

function resolveRunContext(options) {
  const runValue = options.run;
  if (!runValue) {
    return null;
  }
  const resolved = path.resolve(process.cwd(), String(runValue));
  const runDir = resolved.endsWith('run.json') ? path.dirname(resolved) : resolved;
  const metadata = readRunMetadata(runDir);
  return { dir: runDir, data: metadata, id: metadata.id };
}

function readRunMetadata(runDir) {
  const filename = path.join(runDir, 'run.json');
  const raw = fs.readFileSync(filename, 'utf8');
  return JSON.parse(raw);
}

function writeRunMetadata(runDir, data) {
  const updated = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(runDir, 'run.json'), `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
  return updated;
}

function createRunMetadata({ id, name, server, notes }) {
  const now = new Date().toISOString();
  return {
    id,
    name: name || id,
    server,
    notes: notes || '',
    createdAt: now,
    updatedAt: now,
    events: [],
    captures: [],
  };
}

function recordRunEvent(runContext, event) {
  const run = { ...runContext.data };
  const events = Array.isArray(run.events) ? run.events.slice() : [];
  events.push({ timestamp: new Date().toISOString(), ...event });
  run.events = events;
  runContext.data = writeRunMetadata(runContext.dir, run);
}

function recordRunCapture(runContext, capture) {
  const run = { ...runContext.data };
  const captures = Array.isArray(run.captures) ? run.captures.slice() : [];
  captures.push({ timestamp: new Date().toISOString(), ...capture });
  run.captures = captures;
  runContext.data = writeRunMetadata(runContext.dir, run);
}

function inferPluginPath(sourcePath) {
  const normalized = sourcePath.split(path.sep).join('/');
  const marker = '/plugins/';
  const index = normalized.lastIndexOf(marker);
  if (index === -1) {
    return '';
  }
  return normalized.slice(index + 1);
}

function resolveCapturePath(requested, runContext, streamInput, format) {
  if (requested) {
    return path.resolve(process.cwd(), String(requested));
  }

  const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
  const streamLabel = String(streamInput || 'stream').replace(/[^a-z0-9_-]+/gi, '_');
  const filename = `${streamLabel}_${timestamp}.${format === 'json' ? 'json' : 'jsonl'}`;

  if (runContext) {
    const capturesDir = path.join(runContext.dir, 'captures');
    fs.mkdirSync(capturesDir, { recursive: true });
    return path.join(capturesDir, filename);
  }

  return path.join(process.cwd(), filename);
}

async function captureStream({
  url,
  outputPath,
  format,
  maxFrames,
  durationMs,
  componentId,
  entityId,
  includeAcks,
  authHeader,
}) {
  const headers = {
    Accept: 'text/event-stream',
    'User-Agent': 'simeval-cli/1.0',
  };
  const controller = new AbortController();
  if (durationMs) {
    setTimeout(() => controller.abort(), durationMs);
  }

  const response = await fetch(url, applyAuth({ headers, signal: controller.signal }, authHeader));
  if (!response.ok) {
    controller.abort();
    throw new Error(`SSE request failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    controller.abort();
    throw new Error('SSE response missing readable body.');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let frameCount = 0;
  let ackCount = 0;
  let recordCount = 0;
  let stop = false;

  const writer = createRecordWriter(outputPath, format);

  try {
    while (!stop) {
      const result = await reader.read();
      if (!result || result.done) {
        break;
      }
      if (result.value) {
        buffer += decoder.decode(result.value, { stream: true });
        const processed = processSseBuffer(buffer, (message) => {
          if (componentId) {
            if (!isFrameMessage(message)) {
              return true;
            }
            const filtered = filterFrame(message, componentId, entityId);
            if (!filtered) {
              return true;
            }
            frameCount += 1;
            writer.write(filtered);
            recordCount += 1;
            if (maxFrames && frameCount >= maxFrames) {
              stop = true;
              return false;
            }
            return true;
          }

          if (isFrameMessage(message)) {
            frameCount += 1;
            writer.write(message);
            recordCount += 1;
            if (maxFrames && frameCount >= maxFrames) {
              stop = true;
              return false;
            }
            return true;
          }

          if (includeAcks && isAckMessage(message)) {
            ackCount += 1;
            writer.write(message);
            recordCount += 1;
          }
          return true;
        });
        buffer = processed.buffer;
        if (processed.stop) {
          stop = true;
        }
      }
    }
  } catch (error) {
    if (!(controller.signal.aborted && error.name === 'AbortError')) {
      throw error;
    }
  } finally {
    controller.abort();
    await reader.cancel().catch(() => undefined);
    await writer.close();
  }

  return {
    outputPath,
    recordCount,
    frameCount,
    ackCount,
    durationMs: durationMs ?? null,
  };
}

function normalizeUiWsUrl(value) {
  if (!value) {
    return '';
  }
  const input = String(value).trim();
  if (!input) {
    return '';
  }
  if (input.startsWith('ws://') || input.startsWith('wss://')) {
    return input;
  }
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const parsed = new URL(input);
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/ws/control';
    }
    return parsed.toString();
  }
  const trimmed = input.replace(/\/+$/, '');
  return `ws://${trimmed}/ws/control`;
}

function normalizeUiHttpUrl(value) {
  if (!value) {
    return '';
  }
  const input = String(value).trim();
  if (!input) {
    return '';
  }
  if (input.startsWith('ws://') || input.startsWith('wss://')) {
    const parsed = new URL(input);
    parsed.protocol = parsed.protocol === 'wss:' ? 'https:' : 'http:';
    return parsed.origin;
  }
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const parsed = new URL(input);
    return parsed.origin;
  }
  const trimmed = input.replace(/\/+$/, '');
  return `http://${trimmed}`;
}

function resolveUiWsFromHeader(headerValue, httpUrl) {
  if (!headerValue) {
    return '';
  }
  const trimmed = String(headerValue).trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
    return trimmed;
  }
  const base = new URL(httpUrl);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.search = '';
  base.hash = '';
  if (trimmed.startsWith('/')) {
    base.pathname = trimmed;
    return base.toString();
  }
  base.pathname = `/${trimmed.replace(/^\/+/, '')}`;
  return base.toString();
}

async function resolveUiWsUrl(value) {
  const normalized = normalizeUiWsUrl(value);
  if (!normalized) {
    return '';
  }
  const input = String(value ?? '').trim();
  if (!input) {
    return '';
  }
  if (input.startsWith('ws://') || input.startsWith('wss://')) {
    return normalized;
  }
  const httpUrl = normalizeUiHttpUrl(value);
  if (!httpUrl) {
    return normalized;
  }
  try {
    const response = await fetch(httpUrl, { method: 'HEAD' });
    const headerValue = response.headers.get('x-metrics-ui-agent-ws');
    const resolved = resolveUiWsFromHeader(headerValue, httpUrl);
    if (resolved) {
      return resolved;
    }
  } catch {
    // fall back to normalized ws url
  }
  return normalized;
}

async function connectWebSocket(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const onOpen = () => {
      cleanup();
      resolve(socket);
    };
    const onError = (error) => {
      cleanup();
      reject(error ?? new Error(`WebSocket connection failed (${url})`));
    };
    const cleanup = () => {
      socket.removeEventListener('open', onOpen);
      socket.removeEventListener('error', onError);
    };
    socket.addEventListener('open', onOpen);
    socket.addEventListener('error', onError);
  });
}

function sendWsMessage(socket, payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }
  socket.send(JSON.stringify(payload));
  return true;
}

function attachWsErrorLogger(socket, { captureId, label }) {
  let lastError = null;
  const tag = label ? `[${label}] ` : '';
  const onMessage = (event) => {
    const raw = typeof event.data === 'string' ? event.data : event.data?.toString();
    if (!raw) {
      return;
    }
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (!message || (message.type !== 'error' && message.type !== 'ui_error')) {
      return;
    }
    const contextCaptureId = message.payload?.context?.captureId;
    if (captureId && contextCaptureId && contextCaptureId !== captureId) {
      return;
    }
    const errorText = message.error || 'WebSocket error';
    const displayType = message.type === 'ui_error' ? 'ui error' : 'ws error';
    lastError = new Error(errorText);
    console.error(`[simeval-cli] ${tag}${displayType}: ${errorText}`);
  };
  socket.addEventListener('message', onMessage);
  return () => {
    socket.removeEventListener('message', onMessage);
    return lastError;
  };
}

async function waitForWsAck(socket, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const onMessage = (event) => {
      const raw = typeof event.data === 'string' ? event.data : event.data?.toString();
      if (!raw) {
        return;
      }
      try {
        const message = JSON.parse(raw);
        if (message && message.type === 'ack') {
          cleanup();
          resolve(true);
        }
        if (message && message.type === 'error') {
          cleanup();
          resolve(false);
        }
      } catch {
        // ignore parse errors
      }
    };

    const onError = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      socket.removeEventListener('error', onError);
    };

    socket.addEventListener('message', onMessage);
    socket.addEventListener('error', onError);
  });
}

async function waitForWsResponse(socket, { requestId, types, timeoutMs = 2000 }) {
  const typeSet = new Set(types || []);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    const onMessage = (event) => {
      const raw = typeof event.data === 'string' ? event.data : event.data?.toString();
      if (!raw) {
        return;
      }
      let message;
      try {
        message = JSON.parse(raw);
      } catch {
        return;
      }
      if (message && message.type === 'error') {
        if (!requestId || message.request_id === requestId) {
          cleanup();
          reject(new Error(message.error || 'WebSocket error'));
        }
        return;
      }
      if (requestId && message?.request_id !== requestId) {
        return;
      }
      if (typeSet.size > 0 && !typeSet.has(message?.type)) {
        return;
      }
      cleanup();
      resolve(message);
    };

    const onError = (error) => {
      cleanup();
      reject(error ?? new Error('WebSocket error'));
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      socket.removeEventListener('error', onError);
    };

    socket.addEventListener('message', onMessage);
    socket.addEventListener('error', onError);
  });
}

async function waitForUiAckOrThrow(socket, { requestId, timeoutMs = 2000, errorMessage }) {
  const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
  if (!ack) {
    throw new Error(errorMessage || 'Timed out waiting for UI ack.');
  }
  return ack;
}

function printUiSuccess(action, uiUrl, requestId, details = {}) {
  printJson({
    status: 'success',
    action,
    uiUrl,
    requestId,
    ...details,
  });
}

async function forwardStream({
  url,
  uiUrl,
  maxFrames,
  durationMs,
  componentId,
  entityId,
  authHeader,
  captureId,
  filename,
}) {
  const socket = await connectWebSocket(uiUrl);
  let socketClosed = false;
  socket.addEventListener('close', () => {
    socketClosed = true;
  });

  sendWsMessage(socket, { type: 'register', role: 'agent' });
  await waitForWsAck(socket);
  const stopErrorLog = attachWsErrorLogger(socket, { captureId, label: 'stream forward' });
  const initRequestId = buildMessageId(null, `capture-init-${captureId}`);
  sendWsMessage(socket, { type: 'capture_init', captureId, filename, request_id: initRequestId });
  await waitForWsResponse(socket, { requestId: initRequestId, types: ['ack'], timeoutMs: 4000 });

  const headers = {
    Accept: 'text/event-stream',
    'User-Agent': 'simeval-cli/1.0',
  };
  const controller = new AbortController();
  if (durationMs) {
    setTimeout(() => controller.abort(), durationMs);
  }

  const response = await fetch(url, applyAuth({ headers, signal: controller.signal }, authHeader));
  if (!response.ok) {
    controller.abort();
    throw new Error(`SSE request failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    controller.abort();
    throw new Error('SSE response missing readable body.');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let frameCount = 0;
  let ackCount = 0;
  let recordCount = 0;
  let stop = false;

  try {
    while (!stop && !socketClosed) {
      const result = await reader.read();
      if (!result || result.done) {
        break;
      }
      if (result.value) {
        buffer += decoder.decode(result.value, { stream: true });
        const processed = processSseBuffer(buffer, (message) => {
          if (isFrameMessage(message)) {
            let frame = message;
            if (componentId) {
              frame = filterFrame(frame, componentId, entityId);
              if (!frame) {
                return true;
              }
            }
            frameCount += 1;
            recordCount += 1;
            sendWsMessage(socket, { type: 'capture_append', captureId, frame });
            if (maxFrames && frameCount >= maxFrames) {
              stop = true;
              return false;
            }
            return true;
          }

          if (isAckMessage(message)) {
            ackCount += 1;
          }
          return true;
        });
        buffer = processed.buffer;
        if (processed.stop) {
          stop = true;
        }
      }
    }
  } catch (error) {
    if (!(controller.signal.aborted && error.name === 'AbortError')) {
      throw error;
    }
  } finally {
    controller.abort();
    await reader.cancel().catch(() => undefined);
    sendWsMessage(socket, { type: 'capture_end', captureId });
    socket.close();
  }

  return {
    uiUrl,
    captureId,
    recordCount,
    frameCount,
    ackCount,
    durationMs: durationMs ?? null,
  };
}

function buildMultipartUploadStream({ filePath, filename, boundary }) {
  const safeName = String(filename || path.basename(filePath)).replace(/"/g, "'");
  const header =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${safeName}"\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  async function* streamParts() {
    const fileStream = fs.createReadStream(filePath);
    try {
      yield header;
      for await (const chunk of fileStream) {
        yield chunk;
      }
      yield footer;
    } finally {
      fileStream.destroy();
    }
  }

  return Readable.from(streamParts());
}

async function uploadCaptureFileHttp({ uiUrl, filename, filePath }) {
  const endpoint = new URL('/api/upload', uiUrl).toString();
  const boundary = `simeval-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  const body = buildMultipartUploadStream({ filePath, filename, boundary });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
    duplex: 'half',
  });

  const responseText = await response.text();
  let payload = null;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorMessage =
      (payload && payload.error) ||
      responseText ||
      response.statusText ||
      'Upload failed.';
    throw new Error(`Upload failed (${response.status}): ${errorMessage}`);
  }

  if (!payload || !payload.captureId) {
    throw new Error('Upload response missing captureId.');
  }

  return {
    uiUrl,
    captureId: payload.captureId,
    filename: payload.filename || filename || path.basename(filePath),
    size: payload.size ?? null,
  };
}

function createRecordWriter(outputPath, format) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
  let started = false;
  let first = true;
  let pending = Promise.resolve();

  function writeChunk(chunk) {
    if (!stream.write(chunk)) {
      return new Promise((resolve) => stream.once('drain', resolve));
    }
    return Promise.resolve();
  }

  async function writeRecord(record) {
    if (!started && format === 'json') {
      started = true;
      await writeChunk('[\n');
    }
    const payload = JSON.stringify(record);
    if (format === 'json') {
      const prefix = first ? '  ' : ',\n  ';
      first = false;
      await writeChunk(`${prefix}${payload}`);
    } else {
      await writeChunk(`${payload}\n`);
    }
  }

  async function close() {
    await pending;
    if (format === 'json') {
      if (!started) {
        await writeChunk('[]\n');
      } else {
        await writeChunk('\n]\n');
      }
    }
    await new Promise((resolve) => stream.end(resolve));
  }

  function write(record) {
    pending = pending.then(() => writeRecord(record));
    return pending;
  }

  return { write, close };
}

function processSseBuffer(text, onMessage) {
  let working = text;
  let stop = false;
  let delimiterIndex;
  while ((delimiterIndex = working.indexOf('\n\n')) >= 0) {
    const chunk = working.slice(0, delimiterIndex).trim();
    working = working.slice(delimiterIndex + 2);
    if (!chunk) {
      continue;
    }
    const payload = extractEventData(chunk);
    if (!payload) {
      continue;
    }
    const shouldContinue = onMessage(payload);
    if (shouldContinue === false) {
      stop = true;
      break;
    }
  }
  return { buffer: working, stop };
}

function extractEventData(chunk) {
  const lines = chunk.split('\n');
  const dataLines = [];
  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) {
    return null;
  }
  try {
    return JSON.parse(dataLines.join('\n'));
  } catch {
    return null;
  }
}

function isFrameMessage(message) {
  return (
    message &&
    typeof message === 'object' &&
    Number.isFinite(message.tick) &&
    message.entities &&
    typeof message.entities === 'object'
  );
}

function isAckMessage(message) {
  return (
    message &&
    typeof message === 'object' &&
    typeof message.status === 'string' &&
    (message.status === 'success' || message.status === 'error')
  );
}

function extractComponentRecords(frame, componentId, entityFilter) {
  const matches = [];
  const entities = frame.entities ?? {};
  for (const [entityId, components] of Object.entries(entities)) {
    if (entityFilter && entityFilter !== entityId) {
      continue;
    }
    if (!components || typeof components !== 'object') {
      continue;
    }
    if (!(componentId in components)) {
      continue;
    }
    matches.push({
      tick: frame.tick,
      entityId,
      componentId,
      value: components[componentId],
    });
  }
  return matches;
}

function filterFrame(frame, componentId, entityFilter) {
  const entities = frame.entities ?? {};
  const filtered = Object.create(null);

  for (const [entityId, components] of Object.entries(entities)) {
    if (entityFilter && entityFilter !== entityId) {
      continue;
    }
    if (!components || typeof components !== 'object') {
      continue;
    }
    if (!(componentId in components)) {
      continue;
    }
    filtered[entityId] = { [componentId]: components[componentId] };
  }

  if (Object.keys(filtered).length === 0) {
    return null;
  }

  return { ...frame, entities: filtered };
}

function printUsage(command) {
  if (command && typeof command === 'string' && command !== 'health' && command !== 'status') {
    console.error(`[simeval-cli] ${command}`);
  }
  console.log('Usage:');
  console.log('  simeval <command> [options]\n');
  console.log('Commands:');
  console.log('  health                        Check server health');
  console.log('  status                        Show simulation/evaluation status (use --all for recorded deployments)');
  console.log('  start | pause | stop          Control simulation playback');
  console.log('  system inject|eject            Inject or eject a system');
  console.log('  component inject|eject         Inject or eject a component type');
  console.log('  plugin upload                 Upload plugin source to the server');
  console.log('  stream capture|forward|upload  Capture, forward, or upload stream data');
  console.log('  ui <command>                   Control the Metrics UI over WebSocket');
  console.log('  config show|set             Manage CLI defaults');
  console.log('  run create|show|record         Manage and record run metadata');
  console.log('  deploy start|stop|list         Start/stop/list local SimEval deployments');
  console.log('  morphcloud <command>           Manage Morphcloud fleets via the distributor');
  console.log('  fleet [scaffold]               Run Morphcloud deployments or write a config scaffold');
  console.log('  log list|view                  Inspect CLI log files');
  console.log('  codebase tree|file             Explore the server codebase tree/files');
  console.log('  wait                          Poll /status until a state is reached\n');
  console.log('Global options:');
  console.log('  --server       Base server URL (default: http://127.0.0.1:3000/api)');
  console.log('  --token        Authorization token (Bearer prefix optional)');
  console.log('  --cli-config   Path to CLI config JSON (default: ~/.simeval/config.json)');
  console.log('  --run          Path to run directory or run.json');
  console.log('  --message-id   Override generated message id');
  console.log('  --help         Show command help\n');
  console.log('Status options:');
  console.log('  --all          Check recorded deployments');
  console.log('  --prune        Remove unhealthy local deployments (kills processes)');
  console.log('  --prune-morph  Remove unhealthy morphcloud instances from state');
  console.log('  --stop-morph   Stop unhealthy morphcloud instances before pruning');
  console.log('  --state        Deploy state file (default: ~/.simeval/deployments.json)');
  console.log('  --ui-state     UI state file (default: ~/.simeval/ui.json)');
  console.log('  --morph-state  Morphcloud state file (default: ~/.simeval/morphcloud.json)');
  console.log('  --timeout      Probe/stop timeout in ms (default: 2000)');
  console.log('  --signal       Signal for pruning local deployments (default: SIGTERM)\n');
  console.log('System/component options:');
  console.log('  --player       simulation (default) or evaluation');
  console.log('  --module       Module path under plugins/');
  console.log('  --export       Export name (optional)');
  console.log('  --system-id    System id for eject');
  console.log('  --component-id Component id for eject\n');
  console.log('Plugin options:');
  console.log('  --source       Local plugin file path');
  console.log('  --dest         Target plugin path under plugins/');
  console.log('  --overwrite    Replace existing plugin file\n');
  console.log('Stream options:');
  console.log('  --stream       simulation|evaluation|/custom/path');
  console.log('  --frames       Max frames to capture/forward');
  console.log('  --duration     Max capture duration in ms');
  console.log('  --format       jsonl (default) or json');
  console.log('  --component    Component id filter');
  console.log('  --entity       Entity id filter');
  console.log('  --include-acks Include SSE ack messages (capture only)');
  console.log('  --out          Output file path (capture)');
  console.log('  --file         Capture file to upload');
  console.log('  --name         Filename override for UI uploads');
  console.log('  --foreground   Run stream forward in the foreground\n');
  console.log('UI options:');
  console.log('  --ui           Metrics UI websocket or http(s) URL');
  console.log('  --capture-id   Capture id for live streams or metric selection');
  console.log('  --source       Live capture source file path or URL');
  console.log('  --mode         Source mode for ui mode (file|live)');
  console.log('  --ui-dir       Metrics UI directory for ui serve');
  console.log('  --ui-host      Metrics UI host for ui serve');
  console.log('  --ui-port      Metrics UI port for ui serve');
  console.log('  --ui-mode      Metrics UI mode for ui serve (dev|start)');
  console.log('  --skip-install Skip npm install for ui serve');
  console.log('  --path         Metric path (JSON array recommended for dotted keys)');
  console.log('  --full-path    Full metric path for ui deselect');
  console.log('  --group-id     Derivation group id (ui derivation-group-*)');
  console.log('  --new-group-id New derivation group id (ui derivation-group-update)');
  console.log('  --tick         Tick for ui seek');
  console.log('  --speed        Playback speed multiplier');
  console.log('  --window-size  Window size for ui display/series/table');
  console.log('  --window-start Window start tick for ui window range');
  console.log('  --window-end   Window end tick for ui window range');
  console.log('  --enabled      Enable/disable ui auto-scroll/fullscreen (true|false)');
  console.log('  --annotation-id Annotation id for ui annotation commands');
  console.log('  --subtitle-id  Subtitle id for ui subtitle commands');
  console.log('  --start-tick   Subtitle start tick');
  console.log('  --end-tick     Subtitle end tick');
  console.log('  --label        Annotation label for ui add-annotation');
  console.log('  --text         Subtitle text for ui add-subtitle');
  console.log('  --color        Annotation color for ui add-annotation');
  console.log('  --direction    Annotation jump direction (next|previous)');
  console.log('  --poll-ms      Live poll interval in milliseconds');
  console.log('  --poll-seconds Live poll interval in seconds');
  console.log('  --timeout      WebSocket wait timeout in ms\n');
  console.log('UI serve options:');
  console.log('  --ui-dir       Metrics UI project directory (default: ./Stream-Metrics-UI)');
  console.log('  --ui-host      Metrics UI host (default: 127.0.0.1)');
  console.log('  --ui-port      Metrics UI port (default: 5050)');
  console.log('  --ui-mode      dev (default) or start');
  console.log('  --skip-install Skip npm install if node_modules missing\n');
  console.log('UI subcommands:');
  console.log('  serve | shutdown | capabilities | state | components | mode | live-source | live-start | live-stop | live-status');
  console.log('  select | deselect | analysis-select | analysis-deselect | analysis-clear | remove-capture | clear | clear-captures | play | pause | stop | seek | speed');
  console.log('  derivation-group-create | derivation-group-delete | derivation-group-active | derivation-group-update');
  console.log('  window-size | window-start | window-end | window-range | auto-scroll | fullscreen');
  console.log('  add-annotation | remove-annotation | clear-annotations | jump-annotation');
  console.log('  add-subtitle | remove-subtitle | clear-subtitles');
  console.log('  display-snapshot | series-window | render-table | render-debug | debug | memory-stats | metric-coverage | check\n');
  console.log('Run options:');
  console.log('  --name         Run name (create)');
  console.log('  --notes        Run notes (create)');
  console.log('  --no-start     Skip playback start (record)');
  console.log('  --pause        Pause instead of stop after record');
  console.log('  --no-stop      Skip playback stop/pause after record\n');
  console.log('Wait options:');
  console.log('  --state        Desired player state');
  console.log('  --player       simulation (default) or evaluation');
  console.log('  --timeout      Timeout in ms (default: 30000)');
  console.log('  --interval     Poll interval in ms (default: 500)\n');
  console.log('Codebase options:');
  console.log('  --path         Path for tree/file (or --file for file)\n');
  console.log('Deploy start options:');
  console.log('  --port         Port to bind (default: 3000)');
  console.log('  --host         Host to bind (default: 127.0.0.1)');
  console.log('  --workspace    Workspace directory (default: workspaces/Describing_Simulation_0)');
  console.log('  --clean-plugins Remove plugin files before starting');
  console.log('  --build        Force rebuild before start (default)');
  console.log('  --no-build     Skip build (requires dist/main.js)');
  console.log('  --no-auto-start-eval Disable evaluation auto-start');
  console.log('  --log          Log file path (defaults to ~/.simeval/logs/...)');
  console.log('  --log-dir      Log directory (default: ~/.simeval/logs)');
  console.log('  --state        Deploy state file path');
  console.log('  --force        Replace an existing deployment on the port');
  console.log('  --auto-start-eval Enable evaluation auto-start');
  console.log('  --wait         Wait for /health to respond');
  console.log('  --wait-timeout Wait timeout in ms (default: 30000)');
  console.log('  --wait-interval Poll interval in ms (default: 500)\n');
  console.log('Deploy stop options:');
  console.log('  --port         Port to stop');
  console.log('  --pid          PID to stop');
  console.log('  --all          Stop all recorded deployments');
  console.log('  --signal       Signal to send (default: SIGTERM)');
  console.log('  --timeout      Wait timeout in ms (default: 2000)\n');
  console.log('Fleet options:');
  console.log('  --config       Fleet config JSON file (defaults to fleetConfig in ~/.simeval/config.json)');
  console.log('  --ui           Override UI websocket or http(s) URL');
  console.log('  --continue-on-error Continue on instance/deployment failures');
  console.log('  --out          Scaffold output path (fleet scaffold)');
  console.log('  --force        Overwrite existing scaffold file\n');
  console.log('Log options:');
  console.log('  --type         Log type filter (list/view)');
  console.log('  --file         Log filename to view');
  console.log('  --id           Log id/prefix to view');
  console.log('  --log-dir      Log directory (default: ~/.simeval/logs/cli)\n');
  if (!command || command === 'config') {
    console.log('Config options:');
    console.log('  --server       Default server URL');
    console.log('  --token        Default auth token');
    console.log('  --morph-api-key Default Morphcloud API key');
    console.log('  --snapshot     Default snapshot id');
    console.log('  --fleet-config Default fleet config path');
    console.log('  --workspace    Default workspace directory');
    console.log('  --ui           Default Metrics UI URL');
    console.log('  --ui-dir       Default Metrics UI directory');
    console.log('  --ui-host      Default Metrics UI host');
    console.log('  --ui-port      Default Metrics UI port');
    console.log('  --ui-mode      Default Metrics UI mode (dev|start)');
    console.log('');
  }
  if (!command || command === 'fleet') {
    console.log('Fleet config (JSON):');
    console.log('  - Top-level: { ui?, defaults?, deployments: [ ... ] }');
    console.log('  - ui: { url, pollSeconds }');
    console.log('  - defaults/deployments: snapshot, mode (build|clone), count, parallel,');
    console.log('    readyTimeoutMs, readyIntervalMs, captureMode (parallel|sequential)');
    console.log('  - provision: { args?, stateFile?, skipUpdate?, requireUpdate?, memory?, vcpus? }');
    console.log('  - playback: { start?, stop?, pause? }');
    console.log('  - postProvision.exec: [ \"shell command\", ... ]');
    console.log('  - labels: { instance?, snapshot? } (metadata entries, key=value)');
    console.log('  - cleanup: { snapshot?, stop?, stopOnFailure?, forget? }');
    console.log('  - plugins: [ \"plugins/...\", { source, dest, overwrite? } ]');
    console.log('  - components/systems: { player, module, export }');
    console.log('  - captures: { stream, out, frames|durationMs|duration|durationSeconds|durationSec, format?,');
    console.log('      component?, entity?, includeAcks?, ui?: { captureId?, filename?, pollSeconds? } }');
    console.log('  - Templates: ${deployment} ${instance} ${index} ${instanceId} ${runId} in out/captureId/filename\n');
  }
  console.log('Examples:');
  console.log('  # Health + playback');
  console.log('  simeval health --server http://127.0.0.1:3000/api');
  console.log('  simeval status --all');
  console.log('  simeval status --all --prune');
  console.log('  simeval start --server http://127.0.0.1:3000/api');
  console.log('  ');
  console.log('  # Plugins + ECS injection');
  console.log('  simeval plugin upload --source ./mySystem.js --dest plugins/simulation/systems/mySystem.js');
  console.log('  simeval system inject --player simulation --module plugins/simulation/systems/mySystem.js --export createSystem');
  console.log('  ');
  console.log('  # Stream capture + UI');
  console.log('  simeval stream capture --stream simulation --frames 50 --out sim.jsonl');
  console.log('  simeval stream forward --stream evaluation --frames 50 --ui ws://localhost:5050/ws/control');
  console.log('  simeval stream upload --file capture.jsonl --ui http://localhost:5050');
  console.log('  simeval ui serve --ui-dir Stream-Metrics-UI');
  console.log('  simeval ui live-start --source /path/to/capture.jsonl --capture-id live-a --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui select --capture-id live-a --path \'[\"1\",\"highmix.metrics\",\"shift_capacity_pressure\",\"overall\"]\' --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui analysis-select --capture-id live-a --path \'[\"1\",\"highmix.metrics\",\"shift_capacity_pressure\",\"overall\"]\' --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui debug --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui check --capture-id live-a --ui ws://localhost:5050/ws/control');
  console.log('  ');
  console.log('  # Runs + logs');
  console.log('  simeval run create --name demo --server http://127.0.0.1:3000/api');
  console.log('  simeval run record --run runs/run-123 --frames 25 --stream evaluation');
  console.log('  simeval log list --type ui');
  console.log('  simeval log view --file ui_20260101T120000.log');
  console.log('  ');
  console.log('  # Deploy management');
  console.log('  simeval deploy start --port 4000 --workspace ./workspaces/Describing_Simulation_0');
  console.log('  simeval deploy start --port 4000 --clean-plugins --wait');
  console.log('  simeval deploy stop --port 4000');
  console.log('  ');
  console.log('  # Meta / orchestration');
  console.log('  simeval morphcloud list');
  console.log('  simeval fleet scaffold --out fleet.json');
  console.log('  simeval fleet --config fleet.json --ui ws://localhost:5050/ws/control');
  console.log('  simeval codebase tree --server http://127.0.0.1:3000/api');
}
