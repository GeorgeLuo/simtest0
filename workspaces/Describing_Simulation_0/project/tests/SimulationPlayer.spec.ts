import { ComponentManager } from 'src/core/components/ComponentManager';
import { EntityManager } from 'src/core/entity/EntityManager';
import { Bus, acknowledge, noAcknowledgement } from 'src/core/messaging';
import { System } from 'src/core/systems/System';
import { SystemManager } from 'src/core/systems/SystemManager';
import { SimulationPlayer } from 'src/core/simplayer/SimulationPlayer';

class TestSystem extends System {
  public updates = 0;

  // eslint-disable-next-line class-methods-use-this
  protected update(deltaTime: number): void {
    if (deltaTime >= 0) {
      this.updates += 1;
    }
  }
}

describe('SimulationPlayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('executes playback commands and acknowledges them', () => {
    const components = new ComponentManager();
    const entities = new EntityManager(components);
    const systems = new SystemManager();
    const inboundBus = new Bus();
    const outboundBus = new Bus();

    const player = new SimulationPlayer(
      entities,
      components,
      systems,
      inboundBus,
      outboundBus,
      { tickIntervalMs: 5 },
    );

    const startSpy = jest.spyOn(player, 'start');
    const resumeSpy = jest.spyOn(player, 'resume');
    const pauseSpy = jest.spyOn(player, 'pause');
    const stopSpy = jest.spyOn(player, 'stop');

    expect(inboundBus.send('simulation/start', undefined)).toEqual(acknowledge());
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(resumeSpy).toHaveBeenCalledTimes(1);

    expect(inboundBus.send('simulation/pause', undefined)).toEqual(acknowledge());
    expect(pauseSpy).toHaveBeenCalledTimes(1);

    expect(inboundBus.send('simulation/start', undefined)).toEqual(acknowledge());
    expect(resumeSpy).toHaveBeenCalledTimes(2);

    expect(inboundBus.send('simulation/stop', undefined)).toEqual(acknowledge());
    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it('injects systems through the system manager', () => {
    const components = new ComponentManager();
    const entities = new EntityManager(components);
    const systems = new SystemManager();
    const inboundBus = new Bus();
    const outboundBus = new Bus();

    const player = new SimulationPlayer(
      entities,
      components,
      systems,
      inboundBus,
      outboundBus,
    );

    const registerSpy = jest.spyOn(systems, 'register');
    const system = new TestSystem();

    expect(
      inboundBus.send('simulation/system.inject', { system, priority: 3 }),
    ).toEqual(acknowledge());

    expect(registerSpy).toHaveBeenCalledWith(system, 3);

    const registeredSystems: System[] = [];
    systems.forEach((registered) => registeredSystems.push(registered));
    expect(registeredSystems).toContain(system);

    player.stop();
  });

  it('ejects systems through the system manager', () => {
    const components = new ComponentManager();
    const entities = new EntityManager(components);
    const systems = new SystemManager();
    const inboundBus = new Bus();
    const outboundBus = new Bus();

    const player = new SimulationPlayer(
      entities,
      components,
      systems,
      inboundBus,
      outboundBus,
    );

    const system = new TestSystem();
    const removeSpy = jest.spyOn(systems, 'remove');

    removeSpy.mockReturnValueOnce(true);

    expect(inboundBus.send('simulation/system.eject', { system })).toEqual(
      acknowledge(),
    );
    expect(removeSpy).toHaveBeenCalledWith(system);

    removeSpy.mockReturnValueOnce(false);

    expect(inboundBus.send('simulation/system.eject', { system })).toEqual(
      noAcknowledgement(),
    );
    expect(removeSpy).toHaveBeenCalledWith(system);

    player.stop();
  });
});
