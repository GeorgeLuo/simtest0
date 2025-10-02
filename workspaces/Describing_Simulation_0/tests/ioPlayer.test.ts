import { describe, expect, it, beforeEach, vi } from "vitest";
import { fileURLToPath } from "url";
import path from "path";
import { IOPlayer, type OutboundEvent, type CommandMessage } from "../src/core/player/IOPlayer";
import { SimulationPlayer } from "../src/core/player/simplayer/SimulationPlayer";
import { EntityManager } from "../src/core/entity/EntityManager";
import { ComponentManager } from "../src/core/components/ComponentManager";
import { SystemManager } from "../src/core/systems/management/SystemManager";
import { Bus } from "../src/core/messaging/Bus";
import { TimeComponent } from "../src/core/components/time/TimeComponent";
import { TimeSystem } from "../src/core/systems/time/TimeSystem";
import { FrameFilter } from "../src/core/messaging/outbound/FrameFilter";
import { ComponentType } from "../src/core/components/ComponentType";
import { System } from "../src/core/systems/System";

class MockLoop {
  #callback: (() => void) | null = null;
  #running = false;

  start(callback: () => void): void {
    this.#callback = callback;
    this.#running = true;
  }

  stop(): void {
    this.#callback = null;
    this.#running = false;
  }

  trigger(times = 1): void {
    for (let i = 0; i < times; i += 1) {
      this.#callback?.();
    }
  }

  get running(): boolean {
    return this.#running;
  }
}

describe("IOPlayer", () => {
  let components: ComponentManager;
  let entities: EntityManager;
  let systems: SystemManager;
  let inbound: Bus<CommandMessage>;
  let outbound: Bus<OutboundEvent>;
  let loop: MockLoop;
  let player: SimulationPlayer;
  let events: OutboundEvent[];
  let timeSystem: TimeSystem;

  beforeEach(() => {
    components = new ComponentManager();
    entities = new EntityManager(components);
    systems = new SystemManager();
    inbound = new Bus();
    outbound = new Bus();
    loop = new MockLoop();
    events = [];
    outbound.subscribe((event) => {
      events.push(event);
    });

    const timeComponent = new TimeComponent("time");
    timeSystem = new TimeSystem(entities, components, timeComponent);
    systems.add(timeSystem);

    player = new SimulationPlayer(entities, components, systems, loop, inbound, outbound);
  });

  const sendCommand = async (
    command: CommandMessage,
    options: { clearEvents?: boolean } = {},
  ) => {
    if (options.clearEvents ?? true) {
      events.length = 0;
    }
    return await new Promise<OutboundEvent | null>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        unsubscribe();
        reject(new Error(`Timed out waiting for acknowledgement ${command.id}`));
      }, 2000);

      const unsubscribe = outbound.subscribe((event) => {
        if (event.kind === "ack" && event.ack.id === command.id) {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timeout);
          unsubscribe();
          resolve(event);
        }
      });

      inbound.send(command);
    });
  };

  it("acknowledges start command and emits frames", async () => {
    await sendCommand({ id: "1", type: "start" });
    expect(loop.running).toBe(true);
    const ack = events.shift();
    expect(ack?.kind).toBe("ack");
    expect(ack && ack.ack.status).toBe("ok");

    loop.trigger(2);

    const frame = events.find((event) => event.kind === "frame");
    expect(frame?.kind).toBe("frame");
    expect(frame && frame.frame.tick).toBeGreaterThan(0);
  });

  it("pauses and resumes via commands", async () => {
    await sendCommand({ id: "1", type: "start" });
    events = [];
    loop.trigger(1);
    events = [];

    await sendCommand({ id: "2", type: "pause" });
    expect(loop.running).toBe(false);

    loop.trigger(2);
    const frameWhilePaused = events.find((event) => event.kind === "frame");
    expect(frameWhilePaused).toBeUndefined();

    await sendCommand({ id: "3", type: "start" });
    loop.trigger(1);

    const resumedFrame = events.find((event) => event.kind === "frame");
    expect(resumedFrame?.kind).toBe("frame");
  });

  it("stops, clears state, and reports error for unknown command", async () => {
    await sendCommand({ id: "1", type: "start" });
    loop.trigger(3);

    await sendCommand({ id: "2", type: "stop" });
    const stopAck = events.find((event) => event.kind === "ack");
    expect(stopAck && stopAck.ack.status).toBe("ok");
    expect([...entities.list()]).toHaveLength(0);

    const errorAckEvent = await sendCommand({ id: "3", type: "unknown" });
    const errorAck = errorAckEvent?.ack;
    expect(errorAck && errorAck.status).toBe("error");
  });

  it("applies frame allowlists and redaction", async () => {
    player.dispose();
    events = [];

    const secretType = new ComponentType<{ secret: string }>("secret");
    const filteredOutbound = new Bus<OutboundEvent>();
    filteredOutbound.subscribe((event) => events.push(event));
    const filterPlayer = new SimulationPlayer(
      entities,
      components,
      systems,
      loop,
      inbound,
      filteredOutbound,
      {
        filter: new (class extends FrameFilter {
          constructor() {
            super({ allow: ["time", "secret"], redact: (type, value) => {
              if ((type as ComponentType<unknown>).id === "secret") {
                return undefined;
              }
              return value;
            } });
          }
        })(),
      },
    );
    player = filterPlayer;
    outbound = filteredOutbound;

    await sendCommand({ id: "1", type: "start" });
    loop.trigger(1);

    components.set(timeSystem.entity, secretType, { secret: "hidden" });
    events = [];
    loop.trigger(1);

    const frame = events.find((event) => event.kind === "frame");
    expect(frame && frame.frame.tick).toBeGreaterThan(0);
    const entityPayload = frame && frame.frame.entities[0]?.components;
    expect(entityPayload).toBeDefined();
    if (entityPayload) {
      expect(entityPayload).not.toHaveProperty("secret");
      expect(entityPayload).toHaveProperty("time");
    }

    filterPlayer.stop();
    filterPlayer.dispose();
  });

  it("injects and ejects systems via commands", async () => {
    await sendCommand({ id: "start", type: "start" });
    loop.trigger(1);

    const initSpy = vi.fn();
    const updateSpy = vi.fn();
    const destroySpy = vi.fn();

    class ProbeSystem extends System {
      initialize(): void {
        initSpy();
      }

      update(): void {
        updateSpy();
      }

      destroy(): void {
        destroySpy();
      }
    }

    let injected: System | null = null;
    await sendCommand({
      id: "inject",
      type: "inject",
      payload: {
        factory: () => {
          injected = new ProbeSystem(entities, components);
          return injected;
        },
      },
    });

    expect(injected).not.toBeNull();
    expect(initSpy).toHaveBeenCalledTimes(1);

    loop.trigger(2);
    expect(updateSpy).toHaveBeenCalledTimes(2);

    await sendCommand({
      id: "eject",
      type: "eject",
      payload: { system: injected! },
    });

    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(player.listSystems().includes(injected!)).toBe(false);
  });

  it("loads systems from a module path payload", async () => {
    const moduleUrl = new URL("../src/simulations/temperature/index.ts", import.meta.url);
    const modulePath = fileURLToPath(moduleUrl);

    await sendCommand({ id: "start", type: "start" });
    loop.trigger(1);
    events = [];

    const ackEvent = await sendCommand({
      id: "inject-temperature",
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
          coolRate: 0.5,
        },
      },
    });

    expect(ackEvent?.ack.status).toBe("ok");
    expect(player.listSystems().length).toBeGreaterThan(1);

    events = [];
    loop.trigger(5);

    const frame = events.find((event) => event.kind === "frame");
    expect(frame).toBeDefined();
    const tempEntity = frame?.frame.entities.find((entity) =>
      Object.prototype.hasOwnProperty.call(entity.components, "temperature_state"),
    );
    expect(tempEntity?.components).toMatchObject({
      temperature_state: expect.any(Object),
      temperature_settings: expect.any(Object),
      heater_state: expect.any(Object),
    });

    events = [];
    const configAck = await sendCommand({
      id: "temperature-config",
      type: "temperature-config",
      payload: { target: 24 },
    });
    expect(configAck?.ack.status).toBe("ok");
  });

  it("rejects malformed module injection payloads", async () => {
    await sendCommand({ id: "start", type: "start" });
    loop.trigger(1);
    events = [];

    const ackEvent = await sendCommand({
      id: "inject-invalid",
      type: "inject",
      payload: {
        modulePath: path.join("/not", "real", "module.mjs"),
        exportName: "createTemperatureControlSystems",
      },
    });
    expect(ackEvent?.ack.status).toBe("error");
    expect(ackEvent?.ack.error).toContain("module");
  });
});
