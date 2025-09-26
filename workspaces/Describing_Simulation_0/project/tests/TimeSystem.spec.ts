// Test intents:
// - Ensure the time system creates a singleton time entity on initialization.
// - Accumulate elapsed seconds on the time component for each update tick.

import { ComponentManager } from 'src/core/components/ComponentManager';
import { TIME_COMPONENT } from 'src/core/components/TimeComponent';
import { EntityManager } from 'src/core/entity/EntityManager';
import { TimeSystem } from 'src/core/systems/TimeSystem';

describe('TimeSystem', () => {
  it('creates the time entity with a zeroed component when initialized', () => {
    const entities = new EntityManager();
    const components = new ComponentManager();
    const system = new TimeSystem(entities, components);

    system.init();

    expect(entities.has('time')).toBe(true);
    const timeEntity = entities.get('time');
    expect(timeEntity).toBeDefined();
    const timeComponent = components.getComponent(timeEntity!.id, TIME_COMPONENT);
    expect(timeComponent).toEqual({ elapsed: 0 });
  });

  it('increments the time component by delta each update', () => {
    const entities = new EntityManager();
    const components = new ComponentManager();
    const system = new TimeSystem(entities, components);

    system.tick(0.5);
    system.tick(1.5);

    const timeComponent = components.getComponent('time', TIME_COMPONENT);
    expect(timeComponent).toEqual({ elapsed: 2 });
  });
});
