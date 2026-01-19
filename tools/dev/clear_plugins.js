#!/usr/bin/env node
/**
 * Clears plugin files under a given workspace without removing directory scaffolding.
 *
 * Usage:
 *   node tools/dev/clear_plugins.js /path/to/workspace
 *   # defaults to ../workspaces/Describing_Simulation_0 when no argument supplied
 */

const fs = require('fs/promises');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const workspaceArg =
  process.argv[2] ?? path.join(ROOT_DIR, 'workspaces', 'Describing_Simulation_0');
const WORKSPACE_DIR = path.resolve(ROOT_DIR, workspaceArg);
const PLUGINS_DIR = path.join(WORKSPACE_DIR, 'plugins');
const SPEC_PLUGIN_LAYOUT = {
  simulation: ['components', 'systems', 'operations'],
  evaluation: ['components', 'systems', 'operations'],
};
const REQUIRED_DIRECTORIES = new Set();
REQUIRED_DIRECTORIES.add(normalize(PLUGINS_DIR));

function normalize(p) {
  return path.resolve(p);
}

function registerRequiredDirectory(dirPath) {
  REQUIRED_DIRECTORIES.add(normalize(dirPath));
}

function getGitProtectedPaths() {
  try {
    const relPath = path.relative(ROOT_DIR, PLUGINS_DIR);
    const output = execFileSync('git', ['ls-files', '--', relPath], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return new Set(
      output
        .split(/\r?\n/)
        .filter(Boolean)
        .map((relPath) => normalize(path.join(ROOT_DIR, relPath)))
    );
  } catch {
    console.warn('Warning: unable to determine git-tracked plugin files; proceeding without git protection.');
    return new Set();
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function hasProtectedDescendant(targetPath, protectedPaths) {
  const normalizedTarget = normalize(targetPath);
  if (protectedPaths.has(normalizedTarget)) {
    return true;
  }

  const prefix = normalizedTarget.endsWith(path.sep)
    ? normalizedTarget
    : normalizedTarget + path.sep;

  for (const protectedPath of protectedPaths) {
    if (protectedPath.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

async function ensureGitkeep(dirPath) {
  const gitkeepPath = path.join(dirPath, '.gitkeep');
  try {
    await fs.access(gitkeepPath);
  } catch {
    await fs.writeFile(gitkeepPath, '');
  }
  return gitkeepPath;
}

async function removeUnexpectedPath(targetPath, protectedPaths) {
  if (hasProtectedDescendant(targetPath, protectedPaths)) {
    const rel = path.relative(ROOT_DIR, targetPath) || targetPath;
    console.warn(`Skipping removal of protected path: ${rel}`);
    return;
  }

  await fs.rm(targetPath, { recursive: true, force: true });
}

async function enforcePluginLayout(protectedPaths) {
  const allowedGroups = new Set(Object.keys(SPEC_PLUGIN_LAYOUT));
  const pluginEntries = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });

  for (const entry of pluginEntries) {
    const entryPath = path.join(PLUGINS_DIR, entry.name);
    if (entry.isDirectory()) {
      if (!allowedGroups.has(entry.name)) {
        await removeUnexpectedPath(entryPath, protectedPaths);
      }
    } else if (entry.name !== '.gitkeep') {
      await removeUnexpectedPath(entryPath, protectedPaths);
    }
  }

  for (const [group, subdirs] of Object.entries(SPEC_PLUGIN_LAYOUT)) {
    const groupPath = path.join(PLUGINS_DIR, group);
    await fs.mkdir(groupPath, { recursive: true });
    registerRequiredDirectory(groupPath);

    const allowedSubdirs = new Set(subdirs);
    const groupEntries = await fs.readdir(groupPath, { withFileTypes: true });
    for (const entry of groupEntries) {
      const entryPath = path.join(groupPath, entry.name);
      if (entry.isDirectory()) {
        if (!allowedSubdirs.has(entry.name)) {
          await removeUnexpectedPath(entryPath, protectedPaths);
        }
      } else if (entry.name !== '.gitkeep') {
        await removeUnexpectedPath(entryPath, protectedPaths);
      }
    }

    for (const subdir of subdirs) {
      const subdirPath = path.join(groupPath, subdir);
      await fs.mkdir(subdirPath, { recursive: true });
      registerRequiredDirectory(subdirPath);
      await ensureGitkeep(subdirPath);
    }
  }
}

async function clearDirectoryContents(dirPath, protectedPaths) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let removedFiles = 0;

  for (const entry of entries) {
    if (entry.name === '.gitkeep') {
      continue;
    }

    const entryPath = path.join(dirPath, entry.name);
    if (protectedPaths.has(normalize(entryPath))) {
      continue;
    }

    if (entry.isDirectory()) {
      removedFiles += await clearDirectoryContents(entryPath, protectedPaths);
      const normalizedEntry = normalize(entryPath);
      if (!REQUIRED_DIRECTORIES.has(normalizedEntry) && !hasProtectedDescendant(entryPath, protectedPaths)) {
        await fs.rm(entryPath, { recursive: true, force: true });
      }
    } else {
      await fs.unlink(entryPath);
      removedFiles += 1;
    }
  }

  return removedFiles;
}

async function main() {
  if (!(await pathExists(WORKSPACE_DIR))) {
    console.error(`Workspace not found: ${WORKSPACE_DIR}`);
    process.exit(1);
  }

  if (!(await pathExists(PLUGINS_DIR))) {
    console.error(`Plugins directory not found inside workspace: ${PLUGINS_DIR}`);
    process.exit(1);
  }

  const protectedPaths = getGitProtectedPaths();
  await enforcePluginLayout(protectedPaths);
  const pluginGroups = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });
  if (pluginGroups.length === 0) {
    console.log('No plugin directories found to clear.');
    return;
  }

  let totalRemoved = 0;
  for (const entry of pluginGroups) {
    if (!entry.isDirectory()) {
      continue;
    }

    const groupPath = path.join(PLUGINS_DIR, entry.name);
    const removed = await clearDirectoryContents(groupPath, protectedPaths);
    totalRemoved += removed;
    const relativeGroup = path.relative(ROOT_DIR, groupPath) || groupPath;
    if (removed === 0) {
      console.log(`No plugin files to remove under ${relativeGroup}.`);
    } else {
      console.log(`Removed ${removed} file(s) under ${relativeGroup}.`);
    }
  }

  console.log(`Plugin clearing complete. Total files removed: ${totalRemoved}.`);
}

main().catch((err) => {
  console.error('Failed to clear plugins:', err);
  process.exit(1);
});
