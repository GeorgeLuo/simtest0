'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const CLI_CONFIG_FLAG = '--cli-config';

function loadCliConfig({ argv, defaultPath, allowMissing }) {
  const resolved = resolveCliConfigPath(argv ?? [], defaultPath);
  if (!resolved.path) {
    return null;
  }

  if (!fs.existsSync(resolved.path)) {
    if (resolved.explicit && !allowMissing) {
      throw new Error(`CLI config not found: ${resolved.path}`);
    }
    return {
      path: resolved.path,
      dir: path.dirname(resolved.path),
      data: {},
      exists: false,
    };
  }

  let raw;
  try {
    raw = fs.readFileSync(resolved.path, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read CLI config: ${resolved.path}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse CLI config JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('CLI config must be a JSON object.');
  }

  return {
    path: resolved.path,
    dir: path.dirname(resolved.path),
    data: normalizeCliConfig(parsed),
    exists: true,
  };
}

function resolveCliConfigPath(argv, defaultPath) {
  const argValue = readCliConfigArg(argv);
  if (argValue.explicit) {
    const trimmed = String(argValue.value || '').trim();
    if (!trimmed) {
      throw new Error('Missing value for --cli-config.');
    }
    return { path: path.resolve(process.cwd(), expandHome(trimmed)), explicit: true };
  }

  const envPath = process.env.SIMEVAL_CLI_CONFIG;
  if (envPath && String(envPath).trim()) {
    return { path: path.resolve(process.cwd(), expandHome(String(envPath))), explicit: true };
  }

  if (!defaultPath) {
    return { path: null, explicit: false };
  }

  return { path: path.resolve(defaultPath), explicit: false };
}

function readCliConfigArg(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      break;
    }
    if (arg === CLI_CONFIG_FLAG) {
      const next = argv[index + 1];
      return { explicit: true, value: next && !next.startsWith('--') ? next : '' };
    }
    if (arg.startsWith(`${CLI_CONFIG_FLAG}=`)) {
      return { explicit: true, value: arg.slice(CLI_CONFIG_FLAG.length + 1) };
    }
  }
  return { explicit: false, value: null };
}

function expandHome(value) {
  if (value === '~') {
    return os.homedir();
  }
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

function normalizeCliConfig(raw) {
  return {
    server: normalizeString(raw.server ?? raw.baseUrl),
    token: normalizeString(raw.token ?? raw.authToken ?? raw.apiToken),
    snapshot: normalizeString(raw.snapshot ?? raw.defaultSnapshot),
    fleetConfig: normalizeString(raw.fleetConfig ?? raw.fleet?.config ?? raw.fleet?.configPath),
  };
}

function normalizeString(value) {
  if (value === null || typeof value === 'undefined') {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

module.exports = {
  loadCliConfig,
  resolveCliConfigPath,
};
