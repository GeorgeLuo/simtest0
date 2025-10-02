import { beforeEach, describe, expect, it } from "vitest";
import { ComponentManager } from "../src/core/components/ComponentManager";
import { EntityManager } from "../src/core/entity/EntityManager";
import { SystemManager } from "../src/core/systems/management/SystemManager";
import { IOPlayer, type OutboundEvent, type CommandMessage } from "../src/core/player/IOPlayer";
import { Bus } from "../src/core/messaging/Bus";
import {
  TemperatureStateComponent,
  TemperatureSettingsComponent,
  HeaterStateComponent,
} from "../src/simulations/temperature/components";
import { ThermostatSystem } from "../src/simulations/temperature/ThermostatSystem";
import { TemperatureDriftSystem } from "../src/simulations/temperature/TemperatureDriftSystem";
import { createTemperatureControlSystems } from "../src/simulations/temperature";
import type { TemperatureControlConfig } from "../src/simulations/temperature/types";

class MockLoop {
  #callback: (() => void) | null = null;

  start(cb: () => void): void {
    this.#callback = cb;
  }

  stop(): void {
    this.#callback = null;
  }

  trigger(times = 1): void {
    for (let i = 0; i < times; i += 1) {
      this.#callback?.();
    }
  }
}

describe("Temperature control systems", () => {
  let components: ComponentManager;
  let entities: EntityManager;
  let stateType: TemperatureStateComponent;
  let settingsType: TemperatureSettingsComponent;
  let heaterType: HeaterStateComponent;
  let config: TemperatureControlConfig;
  let systemManager: SystemManager;
  let inbound: Bus<CommandMessage>;
  let outbound: Bus<OutboundEvent>;
  let loop: MockLoop;
  let player: IOPlayer;

  beforeEach(() => {
    components = new ComponentManager();
    entities = new EntityManager(components);
    stateType = new TemperatureStateComponent();
    settingsType = new TemperatureSettingsComponent();
    heaterType = new HeaterStateComponent();
    config = {
      initial: 19,
      target: 22,
      tolerance: 0.5,
      ambient: 18,
      heatRate: 1.25,
      coolRate: 0.5,
    } satisfies TemperatureControlConfig;
    systemManager = new SystemManager();
    inbound = new Bus();
    outbound = new Bus();
    loop = new MockLoop();
    player = new IOPlayer(entities, components, systemManager, loop, inbound, outbound);
  });

  function createThermostat() {
    return new ThermostatSystem(entities, components, stateType, settingsType, heaterType, config);
  }

  function createDrift() {
    return new TemperatureDriftSystem(entities, components, stateType, settingsType, heaterType, config);
  }

  it("initializes environment entity with baseline components", () => {
    const thermostat = createThermostat();

    thermostat.initialize();

    const ids = [...entities.list()];
    expect(ids).toHaveLength(1);
    const entity = ids[0];
    expect(components.get(entity, stateType)).toEqual({ value: config.initial });
    expect(components.get(entity, settingsType)).toEqual({
      target: config.target,
      tolerance: config.tolerance,
      ambient: config.ambient,
      heatRate: config.heatRate,
      coolRate: config.coolRate,
    });
    expect(components.get(entity, heaterType)).toEqual({ active: false });
  });

  it("activates heater when temperature is below target minus tolerance and deactivates when above boundary", () => {
    const thermostat = createThermostat();
    thermostat.initialize();

    const entity = [...entities.list()][0];
    components.set(entity, stateType, { value: config.target - config.tolerance - 1 });
    components.set(entity, heaterType, { active: false });

    thermostat.update();
    expect(components.get(entity, heaterType)).toEqual({ active: true });

    components.set(entity, stateType, { value: config.target + config.tolerance + 1 });
    thermostat.update();
    expect(components.get(entity, heaterType)).toEqual({ active: false });
  });

  it("supports runtime configuration updates", () => {
    const thermostat = createThermostat();
    thermostat.initialize();
    const entity = [...entities.list()][0];

    thermostat.configure({ target: 25, heatRate: 2 });

    const updatedSettings = components.get(entity, settingsType);
    expect(updatedSettings).toEqual({
      target: 25,
      tolerance: config.tolerance,
      ambient: config.ambient,
      heatRate: 2,
      coolRate: config.coolRate,
    });
  });

  it("heats environment by configured rate when heater is active", () => {
    const thermostat = createThermostat();
    const drift = createDrift();
    thermostat.initialize();
    drift.initialize();

    const entity = [...entities.list()][0];
    components.set(entity, heaterType, { active: true });
    components.set(entity, stateType, { value: config.initial });

    drift.update();

    expect(components.get(entity, stateType)).toEqual({ value: config.initial + config.heatRate });
  });

  it("cools environment toward ambient when heater inactive, clamping at baseline", () => {
    const thermostat = createThermostat();
    const drift = createDrift();
    thermostat.initialize();
    drift.initialize();

    const entity = [...entities.list()][0];
    components.set(entity, heaterType, { active: false });
    components.set(entity, stateType, { value: config.ambient + 2 });

    drift.update();
    expect(components.get(entity, stateType)).toEqual({ value: config.ambient + 2 - config.coolRate });

    components.set(entity, stateType, { value: config.ambient - 1 });
    drift.update();
    const cooled = components.get(entity, stateType);
    expect(cooled?.value).toBeGreaterThan(config.ambient - 1);
    expect(cooled?.value).toBeLessThanOrEqual(config.ambient);
  });

  it("registers configuration command when systems are created", async () => {
    const systems = createTemperatureControlSystems({ entities, components, systems: systemManager, player }, config);
    systems.forEach((system) => system.initialize());

    const events: OutboundEvent[] = [];
    outbound.subscribe((event) => events.push(event));

    inbound.send({
      id: "temp-config",
      type: "temperature-config",
      payload: { target: 18 },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const entity = [...entities.list()][0];
    const settingsEntry = [...components.getAll(entity).entries()].find(([type]) => (type as { id: string }).id === "temperature_settings");
    expect(settingsEntry?.[1]).toMatchObject({ target: 18 });
    expect(events.some((event) => event.kind === "ack" && event.ack.id === "temp-config")).toBe(true);
  });
});
