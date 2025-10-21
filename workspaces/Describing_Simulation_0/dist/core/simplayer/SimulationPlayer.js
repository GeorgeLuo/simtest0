import path from "node:path";
import { pathToFileURL } from "node:url";
import { stat } from "node:fs/promises";
import { IOPlayer } from "../IOPlayer.js";
import { MessageHandler } from "../messaging/inbound/MessageHandler.js";
import { TimeSystem } from "../systems/TimeSystem.js";
import { StartOperation } from "./operations/Start.js";
import { PauseOperation } from "./operations/Pause.js";
import { StopOperation } from "./operations/Stop.js";
import { InjectSystemOperation, EjectSystemOperation, } from "./operations/SystemInjection.js";
import { SIMULATION_START_MESSAGE, SIMULATION_PAUSE_MESSAGE, SIMULATION_STOP_MESSAGE, SIMULATION_SYSTEM_INJECT_MESSAGE, SIMULATION_SYSTEM_EJECT_MESSAGE, } from "./messages.js";
export { SIMULATION_START_MESSAGE, SIMULATION_PAUSE_MESSAGE, SIMULATION_STOP_MESSAGE, SIMULATION_SYSTEM_INJECT_MESSAGE, SIMULATION_SYSTEM_EJECT_MESSAGE, SIMULATION_COMPONENT_INJECT_MESSAGE, SIMULATION_COMPONENT_EJECT_MESSAGE, } from "./messages.js";
export class SimulationPlayer extends IOPlayer {
    pluginDirectory;
    tickIntervalMs;
    tickTimer = null;
    constructor(options) {
        super(options);
        this.pluginDirectory = options.pluginDirectory
            ? path.resolve(options.pluginDirectory)
            : null;
        this.tickIntervalMs = options.tickIntervalMs ?? 100;
        this.installCoreSystems();
        this.registerPlaybackControls(options.inboundRegistry);
        this.registerDynamicContentHandlers(options.inboundRegistry);
    }
    start() {
        const alreadyRunning = this.isRunning();
        this.installCoreSystems();
        super.start();
        if (!alreadyRunning) {
            this.startTicker();
        }
    }
    pause() {
        super.pause();
        this.stopTicker();
    }
    stop() {
        super.stop();
        this.stopTicker();
    }
    dispose() {
        this.stopTicker();
        super.dispose();
    }
    async injectSystem(payload) {
        if (!payload || typeof payload !== "object") {
            throw new Error("System injection payload is required");
        }
        const { id, module: modulePath, options, index, exportName } = payload;
        if (!id || typeof id !== "string") {
            throw new Error("System injection payload requires string field 'id'");
        }
        if (!modulePath || typeof modulePath !== "string") {
            throw new Error("System injection payload requires string field 'module'");
        }
        const systemConstructor = await this.loadSystemConstructor(modulePath, exportName);
        const normalizedOptions = createSystemConstructionOptions(options);
        const instance = new systemConstructor({
            ...normalizedOptions,
            entityManager: this.entityManager,
            componentManager: this.componentManager,
            systemManager: this.systemManager,
            outboundBus: this.outboundBus,
            getTick: () => this.getTick(),
            player: this,
        });
        this.systemManager.addSystem(instance, { id, index });
    }
    removeSystem(id) {
        this.systemManager.removeSystem(id);
    }
    registerPlaybackControls(registry) {
        registry.register(SIMULATION_START_MESSAGE, new MessageHandler([new StartOperation()]));
        registry.register(SIMULATION_PAUSE_MESSAGE, new MessageHandler([new PauseOperation()]));
        registry.register(SIMULATION_STOP_MESSAGE, new MessageHandler([new StopOperation()]));
    }
    registerDynamicContentHandlers(registry) {
        registry.register(SIMULATION_SYSTEM_INJECT_MESSAGE, new MessageHandler([new InjectSystemOperation()]));
        registry.register(SIMULATION_SYSTEM_EJECT_MESSAGE, new MessageHandler([new EjectSystemOperation()]));
    }
    installCoreSystems() {
        const coreSystemId = "core.time";
        if (this.hasSystem(coreSystemId)) {
            return;
        }
        this.systemManager.addSystem(new TimeSystem(this.entityManager, this.componentManager), { id: coreSystemId, index: 0 });
    }
    hasSystem(id) {
        return this.systemManager.getSystems().some((entry) => entry.id === id);
    }
    startTicker() {
        if (this.tickTimer) {
            return;
        }
        this.tickTimer = setInterval(() => {
            this.step();
        }, this.tickIntervalMs);
        this.tickTimer.unref?.();
    }
    stopTicker() {
        if (!this.tickTimer) {
            return;
        }
        clearInterval(this.tickTimer);
        this.tickTimer = null;
    }
    async loadSystemConstructor(modulePath, exportName) {
        const resolved = this.resolvePluginModulePath(modulePath);
        const moduleUrl = await this.resolveModuleUrl(resolved);
        const moduleExports = await import(moduleUrl);
        const candidate = resolveExportedConstructor(moduleExports, exportName);
        if (!isSystemConstructor(candidate)) {
            throw new Error(`Module '${modulePath}' does not export a valid system constructor`);
        }
        return candidate;
    }
    resolvePluginModulePath(modulePath) {
        if (!this.pluginDirectory) {
            throw new Error("Simulation player plugin directory not configured");
        }
        const absolute = path.resolve(this.pluginDirectory, modulePath);
        const relative = path.relative(this.pluginDirectory, absolute);
        if (relative.startsWith("..") ||
            path.isAbsolute(relative) ||
            relative === "") {
            throw new Error("Module path must reside within the plugin directory");
        }
        return absolute;
    }
    async resolveModuleUrl(resolvedPath) {
        const fileUrl = pathToFileURL(resolvedPath);
        const version = await this.getModuleVersion(resolvedPath);
        const separator = fileUrl.href.includes("?") ? "&" : "?";
        return `${fileUrl.href}${separator}v=${version}`;
    }
    async getModuleVersion(resolvedPath) {
        try {
            const metadata = await stat(resolvedPath);
            return metadata.mtimeMs.toString();
        }
        catch {
            return Date.now().toString();
        }
    }
}
function resolveExportedConstructor(moduleExports, exportName) {
    if (!moduleExports || typeof moduleExports !== "object") {
        return undefined;
    }
    if (exportName) {
        const candidate = moduleExports[exportName];
        return typeof candidate === "function"
            ? candidate
            : undefined;
    }
    const defaultExport = moduleExports.default;
    if (typeof defaultExport === "function") {
        return defaultExport;
    }
    const functionExports = Object.values(moduleExports).filter((value) => typeof value === "function");
    if (functionExports.length === 1) {
        return functionExports[0];
    }
    return undefined;
}
function isSystemConstructor(value) {
    if (typeof value !== "function") {
        return false;
    }
    const prototype = value.prototype;
    return (prototype !== undefined &&
        typeof prototype.update === "function" &&
        typeof prototype.onInit === "function" &&
        typeof prototype.onDestroy === "function");
}
function createSystemConstructionOptions(options) {
    if (isPlainObject(options)) {
        return { ...options };
    }
    if (options === undefined) {
        return {};
    }
    return { value: options };
}
function isPlainObject(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    if (Array.isArray(value)) {
        return false;
    }
    return true;
}
