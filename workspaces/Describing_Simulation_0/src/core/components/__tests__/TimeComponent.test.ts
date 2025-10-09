import { TimeComponent } from '../TimeComponent';

describe('TimeComponent', () => {
  it('validates payloads with non-negative integer ticks', () => {
    expect(TimeComponent.validate({ tick: 0 })).toBe(true);
    expect(TimeComponent.validate({ tick: 5 })).toBe(true);
  });

  it('rejects invalid payloads', () => {
    expect(TimeComponent.validate({ tick: -1 })).toBe(false);
    expect(TimeComponent.validate({ tick: 1.5 })).toBe(false);
    expect(TimeComponent.validate({} as any)).toBe(false);
    expect(TimeComponent.validate({ tick: '1' } as any)).toBe(false);
  });

  it('exposes stable metadata', () => {
    expect(TimeComponent.id).toBe('core.time');
    expect(TimeComponent.description).toBe('Tracks the current simulation tick.');
  });
});
