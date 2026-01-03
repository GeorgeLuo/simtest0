#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { TextDecoder } = require('util');
const { setTimeout: delay } = require('timers/promises');

if (typeof fetch !== 'function') {
  console.error('This tool requires Node.js 18+ (fetch API is unavailable).');
  process.exit(1);
}

const argv = process.argv.slice(2);

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
    case 'run':
      return handleRun(rest);
    case 'wait':
      return handleWait(rest);
    case 'deploy':
      return handleDeploy(rest);
    case 'morphcloud':
      return handleMorphcloud(rest);
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

  const server = resolveServerUrl(options);
  const authHeader = resolveAuthHeader(options);
  const url = buildUrl(server, '/status');
  const response = await requestJson(url, { method: 'GET' }, authHeader);
  printJson(response);
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

  if (subcommand !== 'capture') {
    throw new Error(`Unknown stream subcommand: ${subcommand}`);
  }

  const runContext = resolveRunContext(options);
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

async function handleMorphcloud(argvRest) {
  if (argvRest.length === 0) {
    argvRest = ['--help'];
  }
  const distributorPath = path.resolve(__dirname, 'morphcloud_distributor.js');
  await runCommand('node', [distributorPath, ...argvRest], { cwd: __dirname });
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
  const candidate = options.workspace ?? process.env.SIMEVAL_WORKSPACE;
  const resolved = candidate
    ? path.resolve(process.cwd(), String(candidate))
    : path.resolve(__dirname, '..', 'workspaces', 'Describing_Simulation_0');
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
  return 'auto';
}

function resolveAutoStartEvaluation(options) {
  if (options['no-auto-start-eval']) {
    return false;
  }
  return parseBooleanOption(options['auto-start-eval'], true);
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
  const timeoutMs = parseOptionalNumber(options.timeout, 'timeout') ?? 2000;
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
    process.env.SIMEVAL_AUTH_TOKEN ??
    process.env.SIMEVAL_API_TOKEN ??
    '';
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith('Bearer ') ? trimmed : `Bearer ${trimmed}`;
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

async function requestJson(url, init, authHeader) {
  const response = await fetch(url, applyAuth(init ?? {}, authHeader));
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  return response.json();
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

function buildMessageId(runId, suffix) {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
  const prefix = runId ? `${runId}` : 'cli';
  return `${prefix}-${suffix}-${timestamp}`;
}

function buildRunId() {
  return `run-${new Date().toISOString().replace(/[-:.]/g, '')}`;
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
            const records = extractComponentRecords(message, componentId, entityId);
            if (records.length > 0) {
              frameCount += 1;
            }
            for (const record of records) {
              writer.write(record);
              recordCount += 1;
            }
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

function printUsage(command) {
  if (command && typeof command === 'string' && command !== 'health' && command !== 'status') {
    console.error(`[simeval-cli] ${command}`);
  }
  console.log('Usage:');
  console.log('  node tools/simeval_cli.js <command> [options]\n');
  console.log('Commands:');
  console.log('  health                        Check server health');
  console.log('  status                        Show simulation/evaluation status');
  console.log('  start | pause | stop          Control simulation playback');
  console.log('  system inject|eject            Inject or eject a system');
  console.log('  component inject|eject         Inject or eject a component type');
  console.log('  plugin upload                 Upload plugin source to the server');
  console.log('  stream capture                Capture SSE stream to a file');
  console.log('  run create|show|record         Manage and record run metadata');
  console.log('  deploy start|stop|list         Start/stop/list local SimEval deployments');
  console.log('  morphcloud <command>           Manage Morphcloud fleets via the distributor');
  console.log('  codebase tree|file             Explore the server codebase tree/files');
  console.log('  wait                          Poll /status until a state is reached\n');
  console.log('Global options:');
  console.log('  --server       Base server URL (default: http://127.0.0.1:3000/api)');
  console.log('  --token        Authorization token (Bearer prefix optional)');
  console.log('  --run          Path to run directory or run.json');
  console.log('  --help         Show command help\n');
  console.log('Deploy start options:');
  console.log('  --port         Port to bind (default: 3000)');
  console.log('  --host         Host to bind (default: 127.0.0.1)');
  console.log('  --workspace    Workspace directory (default: workspaces/Describing_Simulation_0)');
  console.log('  --clean-plugins Remove plugin files before starting');
  console.log('  --build        Always build before start');
  console.log('  --no-build     Skip build (requires dist/main.js)');
  console.log('  --no-auto-start-eval Disable evaluation auto-start\n');
  console.log('Examples:');
  console.log('  node tools/simeval_cli.js health --server http://127.0.0.1:3000/api');
  console.log('  node tools/simeval_cli.js system inject --player simulation --module plugins/sim/system.js');
  console.log('  node tools/simeval_cli.js stream capture --stream simulation --frames 50 --out sim.jsonl');
  console.log('  node tools/simeval_cli.js run create --name demo --server http://127.0.0.1:3000/api');
  console.log('  node tools/simeval_cli.js run record --run runs/run-123 --frames 25 --stream evaluation');
  console.log('  node tools/simeval_cli.js deploy start --port 4000 --workspace ./workspaces/Describing_Simulation_0');
  console.log('  node tools/simeval_cli.js deploy stop --port 4000');
  console.log('  node tools/simeval_cli.js deploy start --port 4000 --clean-plugins');
  console.log('  node tools/simeval_cli.js morphcloud list');
  console.log('  node tools/simeval_cli.js codebase tree --server http://127.0.0.1:3000/api');
}
