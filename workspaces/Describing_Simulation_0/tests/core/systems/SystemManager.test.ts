import { beforeEach, describe, expect, it } from 'vitest';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { System } from '../../../src/core/systems/System';
import { SystemManager } from '../../../src/core/systems/SystemManager';

class RecordingSystem extends System {
  constructor(
    id: string,
    private readonly events: string[]
  ) {
    super(id);
  }

  override onInit(): void {
    this.events.push(`init:${this.id}`);
  }

  override update(): void {
    this.events.push(`update:${this.id}`);
  }

  override onDestroy(): void {
    this.events.push(`destroy:${this.id}`);
  }
}

describe('SystemManager', () => {
  let entityManager: EntityManager;
  let componentManager: ComponentManager;
  let systemManager: SystemManager;
  let events: string[];

  beforeEach(() => {
    entityManager = new EntityManager();
    componentManager = new ComponentManager(entityManager);
    systemManager = new SystemManager(entityManager, componentManager);
    events = [];
  });

  it('registers systems and triggers onInit on add', () => {
    const alpha = new RecordingSystem('alpha', events);
    const beta = new RecordingSystem('beta', events);

    systemManager.addSystem(alpha);
    systemManager.addSystem(beta);

    expect(events).toEqual(['init:alpha', 'init:beta']);
    expect(systemManager.listSystems().map((system) => system.id)).toEqual(['alpha', 'beta']);
  });

  it('throws when adding a system with a duplicate identifier', () => {
    const alphaOne = new RecordingSystem('alpha', events);
    const alphaTwo = new RecordingSystem('alpha', events);

    systemManager.addSystem(alphaOne);
    expect(() => systemManager.addSystem(alphaTwo)).toThrowError('System with id alpha already exists');
  });

  it('reports whether a system is registered', () => {
    const alpha = new RecordingSystem('alpha', events);

    expect(systemManager.hasSystem('alpha')).toBe(false);
    systemManager.addSystem(alpha);
    expect(systemManager.hasSystem('alpha')).toBe(true);
  });

  it('removes systems and triggers onDestroy', () => {
    const alpha = new RecordingSystem('alpha', events);
    const beta = new RecordingSystem('beta', events);

    systemManager.addSystem(alpha);
    systemManager.addSystem(beta);
    events.length = 0;

    systemManager.removeSystem('alpha');

    expect(events).toEqual(['destroy:alpha']);
    expect(systemManager.listSystems().map((system) => system.id)).toEqual(['beta']);
  });

  it('silently ignores removal of unknown systems', () => {
    systemManager.removeSystem('ghost');
    expect(events).toEqual([]);
  });

  it('invokes update on each system in order during a tick', () => {
    const alpha = new RecordingSystem('alpha', events);
    const beta = new RecordingSystem('beta', events);

    systemManager.addSystem(alpha);
    systemManager.addSystem(beta);
    events.length = 0;

    systemManager.tick();

    expect(events).toEqual(['update:alpha', 'update:beta']);
  });

  it('inserts systems at specific indices', () => {
    const alpha = new RecordingSystem('alpha', events);
    const beta = new RecordingSystem('beta', events);
    const gamma = new RecordingSystem('gamma', events);

    systemManager.addSystem(alpha);
    systemManager.addSystem(beta);
    systemManager.addSystem(gamma, 1);

    expect(systemManager.listSystems().map((system) => system.id)).toEqual(['alpha', 'gamma', 'beta']);
  });
});
