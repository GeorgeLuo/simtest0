import { SystemManager } from '../SystemManager';
import { System, type SystemContext } from '../System';
import type { EntityManager } from '../../entity/EntityManager';
import type { ComponentManager } from '../../components/ComponentManager';

describe('SystemManager', () => {
  const createContext = () => {
    const entityManager = {} as unknown as EntityManager;
    const componentManager = {} as unknown as ComponentManager;
    const context: SystemContext = { entityManager, componentManager };
    return { context, entityManager, componentManager };
  };

  const createSystem = (label: string) => {
    const hooks: string[] = [];
    class TestSystem extends System {
      initialize(context: SystemContext): void {
        hooks.push(`${label}:initialize:${context.entityManager}`);
      }

      update(context: SystemContext): void {
        hooks.push(`${label}:update:${context.componentManager}`);
      }

      destroy(context: SystemContext): void {
        hooks.push(`${label}:destroy:${context.entityManager}`);
      }
    }

    const system = new TestSystem();
    return { system, hooks };
  };

  it('registers systems, invokes initialize, and preserves order', () => {
    const { context } = createContext();
    const manager = new SystemManager(context.entityManager, context.componentManager);

    const a = createSystem('A');
    const b = createSystem('B');

    manager.addSystem(a.system);
    manager.addSystem(b.system);

    expect(a.hooks).toEqual([`A:initialize:${context.entityManager}`]);
    expect(b.hooks).toEqual([`B:initialize:${context.entityManager}`]);
    expect(manager.getSystems()).toEqual([a.system, b.system]);
  });

  it('allows insertion at a specific index', () => {
    const { context } = createContext();
    const manager = new SystemManager(context.entityManager, context.componentManager);

    const a = createSystem('A');
    const b = createSystem('B');
    const c = createSystem('C');

    manager.addSystem(a.system);
    manager.addSystem(c.system);
    manager.addSystem(b.system, 1);

    expect(manager.getSystems()).toEqual([a.system, b.system, c.system]);
  });

  it('executes update on each system during runCycle', () => {
    const { context } = createContext();
    const manager = new SystemManager(context.entityManager, context.componentManager);

    const a = createSystem('A');
    const b = createSystem('B');
    manager.addSystem(a.system);
    manager.addSystem(b.system);

    manager.runCycle();

    const aUpdateIndex = a.hooks.indexOf(`A:update:${context.componentManager}`);
    const bUpdateIndex = b.hooks.indexOf(`B:update:${context.componentManager}`);
    expect(aUpdateIndex).toBeGreaterThan(-1);
    expect(bUpdateIndex).toBeGreaterThan(-1);
  });

  it('removes systems, triggers destroy, and stops further updates', () => {
    const { context } = createContext();
    const manager = new SystemManager(context.entityManager, context.componentManager);

    const a = createSystem('A');
    manager.addSystem(a.system);

    expect(manager.removeSystem(a.system)).toBe(true);
    expect(a.hooks).toContain(`A:destroy:${context.entityManager}`);

    manager.runCycle();
    const updates = a.hooks.filter((entry) => entry.startsWith('A:update'));
    expect(updates).toHaveLength(0);
  });

  it('returns shared context via getContext', () => {
    const { context } = createContext();
    const manager = new SystemManager(context.entityManager, context.componentManager);
    expect(manager.getContext()).toStrictEqual(context);
  });
});
