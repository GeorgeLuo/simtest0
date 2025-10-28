import { ComponentManager } from '../ComponentManager';
import type { ComponentType } from '../ComponentType';
import { EntityManager } from '../../entity/EntityManager';

interface MockPayload {
  value: number;
}

const mockType: ComponentType<MockPayload> = {
  id: 'mock.type',
  description: 'Mock component for testing',
  validate: (payload) => typeof payload.value === 'number',
};

const createManagers = () => ({
  entities: new EntityManager(),
  components: new ComponentManager(),
});

describe('ComponentManager', () => {
  it('associates payloads keyed by ComponentType per entity', () => {
    const { entities, components } = createManagers();
    const entity = entities.create();
    const payload = { value: 10 } satisfies MockPayload;
    components.addComponent(entity, mockType, payload);

    expect(components.getComponent(entity, mockType)?.payload).toEqual(payload);
  });

  it('replaces component when addComponent is invoked with the same type', () => {
    const { entities, components } = createManagers();
    const entity = entities.create();
    components.addComponent(entity, mockType, { value: 1 });
    components.addComponent(entity, mockType, { value: 2 });

    expect(components.getComponent(entity, mockType)?.payload).toEqual({ value: 2 });
  });

  it('removeComponent detaches only the specified component', () => {
    const { entities, components } = createManagers();
    const entity = entities.create();
    components.addComponent(entity, mockType, { value: 1 });

    expect(components.removeComponent(entity, mockType)).toBe(true);
    expect(components.getComponent(entity, mockType)).toBeUndefined();
    expect(components.removeComponent(entity, mockType)).toBe(false);
  });

  it('removeAll purges all components for an entity', () => {
    const { entities, components } = createManagers();
    const entity = entities.create();
    components.addComponent(entity, mockType, { value: 1 });

    expect(components.removeAll(entity)).toBe(1);
    expect(components.getComponents(entity)).toHaveLength(0);
  });

  it('getEntitiesWithComponent returns entities holding a component type', () => {
    const { entities, components } = createManagers();
    const entityA = entities.create();
    const entityB = entities.create();
    components.addComponent(entityA, mockType, { value: 1 });
    components.addComponent(entityB, mockType, { value: 2 });

    expect(new Set(components.getEntitiesWithComponent(mockType))).toEqual(new Set([entityA, entityB]));
  });

  it('handles entity removal by allowing external cleanup expectations', () => {
    const { entities, components } = createManagers();
    const entity = entities.create();
    components.addComponent(entity, mockType, { value: 1 });

    expect(components.getComponents(entity)).toHaveLength(1);
    entities.remove(entity);
    // Stage 4 will wire automatic cleanup; for now we ensure manager state can be inspected.
    expect(components.getComponents(entity)).toHaveLength(1);
  });
});
