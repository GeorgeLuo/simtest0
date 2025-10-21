export const CODEBASE_ROUTE_PREFIX = "/codebase";
export const CODEBASE_TREE_PATH = `${CODEBASE_ROUTE_PREFIX}/tree`;
export const CODEBASE_FILE_PATH = `${CODEBASE_ROUTE_PREFIX}/file`;
export const CODEBASE_PLUGIN_PATH = `${CODEBASE_ROUTE_PREFIX}/plugin`;
;
export function registerCodebaseRoutes(router, dependencies) {
    router.register({
        method: "GET",
        path: CODEBASE_TREE_PATH,
        handler: async () => ({
            status: 200,
            body: {
                entries: await readDirectoryTree(dependencies.rootDirectory, dependencies),
            },
        }),
    });
    router.register({
        method: "GET",
        path: CODEBASE_FILE_PATH,
        handler: (context) => serveFile(context, dependencies),
    });
    router.register({
        method: "POST",
        path: CODEBASE_PLUGIN_PATH,
        handler: (context) => handlePluginUpload(context, dependencies),
    });
}
async function readDirectoryTree(directory, dependencies) {
    const entries = await dependencies.fs.readdir(directory, { withFileTypes: true });
    const result = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        const fullPath = dependencies.path.join(directory, entry.name);
        if (entry.isDirectory()) {
            result.push({
                name: entry.name,
                type: "directory",
                children: await readDirectoryTree(fullPath, dependencies),
            });
        }
        else if (entry.isFile()) {
            result.push({
                name: entry.name,
                type: "file",
            });
        }
    }
    return result;
}
async function serveFile(context, dependencies) {
    const requestedPath = typeof context.query?.path === "string"
        ? context.query.path
        : Array.isArray(context.query?.path)
            ? context.query?.path[0]
            : undefined;
    if (!requestedPath) {
        return {
            status: 400,
            body: { error: "Query parameter 'path' is required" },
        };
    }
    const normalized = sanitizePath(requestedPath, dependencies.rootDirectory, dependencies);
    if (!normalized.valid) {
        return {
            status: 400,
            body: { error: normalized.reason },
        };
    }
    try {
        const content = await dependencies.fs.readFile(normalized.absolute, "utf-8");
        return {
            status: 200,
            body: {
                path: requestedPath,
                content,
            },
        };
    }
    catch (error) {
        return {
            status: 404,
            body: {
                error: error instanceof Error ? error.message : "File not found",
            },
        };
    }
}
async function handlePluginUpload(context, dependencies) {
    const payload = context.body;
    const path = payload?.path;
    const content = payload?.content;
    if (!path || typeof content !== "string") {
        return {
            status: 400,
            body: { error: "Plugin payload requires 'path' and 'content' fields" },
        };
    }
    const normalized = sanitizePath(path, dependencies.pluginDirectory, dependencies);
    if (!normalized.valid) {
        return {
            status: 400,
            body: { error: normalized.reason },
        };
    }
    if (!normalized.relative) {
        return {
            status: 400,
            body: { error: "Plugin path must reference a file within the plugin directory" },
        };
    }
    const directorySegments = normalized.segments.slice(0, -1);
    const directory = directorySegments.length === 0
        ? dependencies.path.normalize(dependencies.path.join(dependencies.pluginDirectory))
        : dependencies.path.normalize(dependencies.path.join(dependencies.pluginDirectory, ...directorySegments));
    await dependencies.fs.mkdir(directory, { recursive: true });
    await dependencies.fs.writeFile(normalized.absolute, content);
    return {
        status: 201,
        body: { path },
    };
}
function sanitizePath(requestedPath, baseDirectory, dependencies) {
    if (!requestedPath || requestedPath.includes("\0")) {
        return { valid: false, reason: "Invalid path" };
    }
    if (requestedPath.startsWith("/")) {
        return { valid: false, reason: "Absolute paths are not permitted" };
    }
    const baseNormalized = dependencies.path.normalize(baseDirectory);
    const segments = requestedPath.split("/");
    const safeSegments = [];
    for (const segment of segments) {
        if (!segment || segment === ".") {
            continue;
        }
        if (segment === "..") {
            if (safeSegments.length === 0) {
                return {
                    valid: false,
                    reason: "Resolved path is outside plugin directory",
                };
            }
            safeSegments.pop();
            continue;
        }
        safeSegments.push(segment);
    }
    const relativePath = safeSegments.join("/");
    const absolute = dependencies.path.normalize(safeSegments.length > 0
        ? dependencies.path.join(baseNormalized, ...safeSegments)
        : baseNormalized);
    if (!absolute.startsWith(baseNormalized)) {
        return {
            valid: false,
            reason: "Resolved path is outside plugin directory",
        };
    }
    return {
        valid: true,
        absolute,
        relative: relativePath,
        segments: safeSegments,
    };
}
