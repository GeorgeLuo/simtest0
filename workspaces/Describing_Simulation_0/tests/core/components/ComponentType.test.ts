import { describe, expect, it } from 'vitest';
import { ComponentType } from '../../../src/core/components/ComponentType';
import { Entity } from '../../../src/core/entity/Entity';

type TemperatureData = { value: number };

class TemperatureComponentType extends ComponentType<TemperatureData> {
  constructor() {
    super('temperature');
  }

  protected validate(data: TemperatureData): void {
    if (!Number.isFinite(data.value)) {
      throw new Error('Temperature must be finite');
    }
  }
}

describe('ComponentType', () => {
  it('exposes a stable identifier', () => {
    const type = new TemperatureComponentType();
    expect(type.id).toBe('temperature');
  });

  it('validates data before creating component instances', () => {
    const type = new TemperatureComponentType();
    const entity: Entity = 1;

    const component = type.create(entity, { value: 37 });
    expect(component.entity).toBe(entity);
    expect(component.type).toBe(type);
    expect(component.data).toEqual({ value: 37 });

    expect(() => type.create(entity, { value: Number.NaN })).toThrow('Temperature must be finite');
  });
});
