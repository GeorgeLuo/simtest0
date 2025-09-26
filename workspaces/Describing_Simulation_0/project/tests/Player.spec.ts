import { Player } from '../src/core/Player';
import { ComponentManager } from '../src/core/components/ComponentManager';
import { ComponentType } from '../src/core/components/ComponentType';
import { EntityManager } from '../src/core/entity/EntityManager';
import { SystemManager } from '../src/core/systems/SystemManager';

describe('Player', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('advances registered systems on the configured cadence', () => {
    const components = new ComponentManager();
    const entities = new EntityManager(components);
    const systems = new SystemManager();
    const tickSpy = jest.spyOn(systems, 'tick');

    let currentTime = 0;
    const timeProvider = jest.fn(() => currentTime);

    const player = new Player(entities, components, systems, {
      tickIntervalMs: 20,
      timeProvider,
    });

    player.start();

    expect(timeProvider).toHaveBeenCalledTimes(1);

    currentTime += 20;
    jest.advanceTimersByTime(20);

    expect(tickSpy).toHaveBeenCalledTimes(1);
    expect(tickSpy).toHaveBeenLastCalledWith(0.02);

    currentTime += 20;
    jest.advanceTimersByTime(20);

    expect(tickSpy).toHaveBeenCalledTimes(2);
    expect(tickSpy).toHaveBeenLastCalledWith(0.02);

    player.stop();
  });

  it('pauses and resumes without accumulating paused time', () => {
    const components = new ComponentManager();
    const entities = new EntityManager(components);
    const systems = new SystemManager();
    const tickSpy = jest.spyOn(systems, 'tick');

    let currentTime = 0;
    const timeProvider = jest.fn(() => currentTime);

    const player = new Player(entities, components, systems, {
      tickIntervalMs: 10,
      timeProvider,
    });

    player.start();

    currentTime += 10;
    jest.advanceTimersByTime(10);
    expect(tickSpy).toHaveBeenCalledTimes(1);
    expect(tickSpy).toHaveBeenLastCalledWith(0.01);

    player.pause();

    currentTime += 50;
    jest.advanceTimersByTime(50);
    expect(tickSpy).toHaveBeenCalledTimes(1);

    player.resume();

    currentTime += 10;
    jest.advanceTimersByTime(10);
    expect(tickSpy).toHaveBeenCalledTimes(2);
    expect(tickSpy).toHaveBeenLastCalledWith(0.01);

    player.stop();
  });

  it('tears down entities, components, and systems when stopped', () => {
    const components = new ComponentManager();
    const entities = new EntityManager(components);
    const systems = new SystemManager();
    const destroySpy = jest.spyOn(systems, 'destroyAll');

    const SampleComponent = new ComponentType<{ value: number }>('sample');
    components.register(SampleComponent);

    const entity = entities.create('entity');
    components.setComponent(entity.id, SampleComponent, { value: 42 });

    const player = new Player(entities, components, systems, {
      tickIntervalMs: 5,
    });

    player.start();
    player.stop();

    expect(destroySpy).toHaveBeenCalledTimes(1);
    expect(entities.list()).toHaveLength(0);
    expect(
      components.getComponentsForEntity(entity.id).size
    ).toBe(0);
  });
});
