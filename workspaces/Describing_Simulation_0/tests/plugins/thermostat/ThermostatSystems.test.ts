import { describe, expect, it } from 'vitest';
import { ManualPlayer } from '../../../src/core/player/ManualPlayer';
import {
  HVACUsageComponent,
  OutsideTemperatureComponent,
  RoomTemperatureComponent,
  ThermostatComponent,
  ThermostatSettings
} from '../../../src/plugins/thermostat/components';
import {
  OutsideTemperatureSystem,
  RoomThermalResponseSystem,
  ThermostatControlSystem
} from '../../../src/plugins/thermostat/systems';

describe('Thermostat systems', () => {
  it('switches between heating, idle, and cooling based on temperature band', () => {
    const player = new ManualPlayer();
    const thermostatComponent = new ThermostatComponent();
    const roomComponent = new RoomTemperatureComponent();

    const entity = player.entityManager.createEntity();
    const thermostat = player.componentManager.addComponent(entity, thermostatComponent, {
      targetTemperatureC: 21,
      toleranceC: 0.5,
      state: 'idle'
    });
    player.componentManager.addComponent(entity, roomComponent, { temperatureC: 19 });

    const system = new ThermostatControlSystem(thermostatComponent, roomComponent, {
      minutesPerTick: 1,
      minimumStateDurationMinutes: 0
    });

    system.update(player.entityManager, player.componentManager);
    expect(thermostat.data.state).toBe('heating');

    thermostat.data = { ...thermostat.data, state: 'idle' } satisfies ThermostatSettings;
    player.componentManager.getComponent(entity, roomComponent)!.data = { temperatureC: 21 };
    system.update(player.entityManager, player.componentManager);
    expect(thermostat.data.state).toBe('idle');

    player.componentManager.getComponent(entity, roomComponent)!.data = { temperatureC: 23 };
    system.update(player.entityManager, player.componentManager);
    expect(thermostat.data.state).toBe('cooling');
  });

  it('adjusts room temperature and tracks energy usage', () => {
    const player = new ManualPlayer();
    const thermostatComponent = new ThermostatComponent();
    const roomComponent = new RoomTemperatureComponent();
    const outsideComponent = new OutsideTemperatureComponent();
    const usageComponent = new HVACUsageComponent();

    const entity = player.entityManager.createEntity();
    player.componentManager.addComponent(entity, roomComponent, { temperatureC: 19 });
    const thermostat = player.componentManager.addComponent(entity, thermostatComponent, {
      targetTemperatureC: 21,
      toleranceC: 0.5,
      state: 'heating'
    });
    player.componentManager.addComponent(entity, outsideComponent, { temperatureC: 10 });
    const usage = player.componentManager.addComponent(entity, usageComponent, {
      totalEnergyKwh: 0,
      heatingEnergyKwh: 0,
      coolingEnergyKwh: 0,
      heatingMinutes: 0,
      coolingMinutes: 0
    });

    const system = new RoomThermalResponseSystem(
      roomComponent,
      thermostatComponent,
      outsideComponent,
      usageComponent,
      {
        minutesPerTick: 1,
        heatLossRate: 0.05,
        heatingRatePerMinute: 0.8,
        coolingRatePerMinute: 0.6,
        heatingPowerKw: 5,
        coolingPowerKw: 4
      }
    );

    system.update(player.entityManager, player.componentManager);
    expect(player.componentManager.getComponent(entity, roomComponent)!.data.temperatureC).toBeGreaterThan(19);
    expect(usage.data.totalEnergyKwh).toBeGreaterThan(0);

    thermostat.data = { ...thermostat.data, state: 'cooling' } satisfies ThermostatSettings;
    player.componentManager.getComponent(entity, outsideComponent)!.data = { temperatureC: 30 };
    const previousTemp = player.componentManager.getComponent(entity, roomComponent)!.data.temperatureC;

    system.update(player.entityManager, player.componentManager);
    expect(player.componentManager.getComponent(entity, roomComponent)!.data.temperatureC).toBeLessThan(previousTemp);
    expect(usage.data.totalEnergyKwh).toBeGreaterThan(0);
  });

  it('produces a sinusoidal outside temperature profile', () => {
    const player = new ManualPlayer();
    const outsideComponent = new OutsideTemperatureComponent();
    const entity = player.entityManager.createEntity();
    const outside = player.componentManager.addComponent(entity, outsideComponent, { temperatureC: 0 });

    const system = new OutsideTemperatureSystem(outsideComponent, player.timeSystem, player.timeComponent, {
      minutesPerTick: 60,
      cycleMinutes: 24 * 60,
      meanTemperatureC: 15,
      amplitudeC: 10,
      phaseOffsetMinutes: 0
    });

    player.injectSystem(system);

    const temperatures: number[] = [];
    for (let i = 0; i < 24; i += 1) {
      player.step();
      temperatures.push(outside.data.temperatureC);
    }

    expect(Math.max(...temperatures)).toBeGreaterThan(Math.min(...temperatures));
  });
});
