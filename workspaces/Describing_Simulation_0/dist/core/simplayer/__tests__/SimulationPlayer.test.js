import { describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ComponentManager } from "../../components/ComponentManager.js";
import { ComponentType } from "../../components/ComponentType.js";
import { EntityManager } from "../../entity/EntityManager.js";
import { Bus } from "../../messaging/Bus.js";
import { InboundHandlerRegistry } from "../../messaging/inbound/InboundHandlerRegistry.js";
import { SimulationPlayer, SIMULATION_PAUSE_MESSAGE, SIMULATION_START_MESSAGE, SIMULATION_STOP_MESSAGE, SIMULATION_SYSTEM_INJECT_MESSAGE, } from "../SimulationPlayer.js";
import { SystemManager } from "../../systems/SystemManager.js";
const createContext = (options = {}) => {
    const componentManager = new ComponentManager();
    const entityManager = new EntityManager(componentManager);
    const systemManager = new SystemManager();
    const inboundBus = new Bus();
    const outboundBus = new Bus();
    const inboundRegistry = new InboundHandlerRegistry();
    const player = new SimulationPlayer({
        componentManager,
        entityManager,
        systemManager,
        inboundBus,
        outboundBus,
        inboundRegistry,
        pluginDirectory: options.pluginDirectory,
    });
    const events = [];
    outboundBus.subscribe((event) => {
        events.push(event);
    });
    return {
        player,
        inboundBus,
        outboundBus,
        inboundRegistry,
        componentManager,
        entityManager,
        systemManager,
        events,
        pluginDirectory: options.pluginDirectory,
        dispose: () => player.dispose(),
    };
};
const isAcknowledgementEvent = (event) => event.type === "acknowledgement";
const waitForAck = async (events, messageId) => {
    await vi.waitFor(() => {
        const acknowledgementEvent = events
            .filter(isAcknowledgementEvent)
            .find((event) => event.acknowledgement.messageId === messageId);
        expect(acknowledgementEvent).toBeDefined();
        expect(acknowledgementEvent?.acknowledgement.status).toBe("success");
    });
};
describe("SimulationPlayer", () => {
    it("registers playback handlers for start, pause, and stop", () => {
        const ctx = createContext();
        expect(ctx.inboundRegistry.get(SIMULATION_START_MESSAGE)).toBeDefined();
        expect(ctx.inboundRegistry.get(SIMULATION_PAUSE_MESSAGE)).toBeDefined();
        expect(ctx.inboundRegistry.get(SIMULATION_STOP_MESSAGE)).toBeDefined();
        ctx.dispose();
    });
    it("starts playback and acknowledges inbound start messages", async () => {
        const ctx = createContext();
        const message = {
            id: "start-1",
            type: SIMULATION_START_MESSAGE,
            payload: null,
        };
        ctx.inboundBus.publish(message);
        await waitForAck(ctx.events, message.id);
        expect(ctx.player.isRunning()).toBe(true);
        ctx.dispose();
    });
    it("pauses playback on pause messages and acknowledges success", async () => {
        const ctx = createContext();
        ctx.player.start();
        const message = {
            id: "pause-1",
            type: SIMULATION_PAUSE_MESSAGE,
            payload: undefined,
        };
        ctx.inboundBus.publish(message);
        await waitForAck(ctx.events, message.id);
        expect(ctx.player.isRunning()).toBe(false);
        ctx.dispose();
    });
    it("stops playback, tears down entities, and acknowledges", async () => {
        const ctx = createContext();
        const componentType = new ComponentType("test.component");
        const entity = ctx.entityManager.createEntity();
        ctx.componentManager.addComponent(entity, componentType, { value: 42 });
        ctx.player.start();
        ctx.player.step();
        const message = {
            id: "stop-1",
            type: SIMULATION_STOP_MESSAGE,
            payload: {},
        };
        ctx.inboundBus.publish(message);
        await waitForAck(ctx.events, message.id);
        expect(ctx.entityManager.getEntities()).toHaveLength(0);
        expect(ctx.player.getTick()).toBe(0);
        expect(ctx.player.isRunning()).toBe(false);
        ctx.dispose();
    });
    it("injects systems via inbound messages", async () => {
        const pluginDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "sim-player-"));
        const moduleRelative = path.join("simulation", "systems", "InjectedSystem.js");
        const moduleAbsolute = path.join(pluginDirectory, moduleRelative);
        await fs.mkdir(path.dirname(moduleAbsolute), { recursive: true });
        await fs.writeFile(moduleAbsolute, [
            "export class InjectedSystem {",
            "  constructor() { this.updated = 0; }",
            "  onInit() {}",
            "  update() { this.updated += 1; }",
            "  onDestroy() {}",
            "}",
        ].join("\n"), "utf-8");
        const ctx = createContext({ pluginDirectory });
        const message = {
            id: "inject-1",
            type: SIMULATION_SYSTEM_INJECT_MESSAGE,
            payload: {
                id: "test-system",
                module: moduleRelative,
            },
        };
        ctx.inboundBus.publish(message);
        await waitForAck(ctx.events, message.id);
        expect(ctx.systemManager.getSystems().some((entry) => entry.id === "test-system")).toBe(true);
        ctx.dispose();
    });
});
