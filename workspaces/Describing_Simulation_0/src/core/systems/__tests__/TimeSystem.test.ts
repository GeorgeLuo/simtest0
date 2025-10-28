import { TimeSystem } from '../TimeSystem';
import { TimeComponent } from '../../components/TimeComponent';
import type { SystemContext } from '../System';
import type { Entity } from '../../entity/Entity';
import type { ComponentManager } from '../../components/ComponentManager';
import type { EntityManager } from '../../entity/EntityManager';
import type { ComponentInstance } from '../../components/ComponentType';

describe('TimeSystem', () => {
  const createContext = () => {
    let nextEntity = 0 as Entity;

    const entityCreate = jest.fn(() => {
      const id = nextEntity;
      nextEntity = (nextEntity + 1) as Entity;
      return id;
    });

    const entityManager = {
      create: entityCreate,
      remove: jest.fn(),
      has: jest.fn(),
      list: jest.fn(),
    } as unknown as EntityManager;

    const addComponent = jest.fn();
    const getComponent = jest.fn<ComponentInstance<{ tick: number }> | undefined, [Entity, typeof TimeComponent]>();

    const componentManager = {
      addComponent,
      removeComponent: jest.fn(),
      removeAll: jest.fn(),
      getComponent,
      getComponents: jest.fn(),
      getEntitiesWithComponent: jest.fn(),
    } as unknown as ComponentManager;

    const context: SystemContext = { entityManager, componentManager };

    return {
      context,
      entityCreate,
      addComponent,
      getComponent,
    };
  };

  it('creates time entity with tick 0 on initialize', () => {
    const { context, entityCreate, addComponent } = createContext();
    const system = new TimeSystem();

    expect(() => system.initialize(context)).not.toThrow();
    expect(entityCreate).toHaveBeenCalledTimes(1);

    const createdEntity = entityCreate.mock.results[0]?.value;
    expect(addComponent).toHaveBeenCalledWith(createdEntity, TimeComponent, { tick: 0 });
  });

  it('increments tick on each update call', () => {
    const { context, entityCreate, addComponent, getComponent } = createContext();
    const system = new TimeSystem();

    system.initialize(context);

    const createdEntity = entityCreate.mock.results[0]?.value;

    getComponent.mockReturnValue({
      type: TimeComponent,
      payload: { tick: 2 },
    } as ComponentInstance<{ tick: number }>);

    expect(() => system.update(context)).not.toThrow();

    expect(getComponent).toHaveBeenCalledWith(createdEntity, TimeComponent);
    expect(addComponent).toHaveBeenLastCalledWith(createdEntity, TimeComponent, { tick: 3 });
  });
});
