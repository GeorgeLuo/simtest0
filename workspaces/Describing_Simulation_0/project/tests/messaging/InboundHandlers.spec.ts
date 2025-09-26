// Test intents:
// - InboundHandlerRegistry dispatches frames to matching operations and aggregates acknowledgements.
// - Duplicate registrations are rejected and handlers can be removed via the disposer.

import {
  Bus,
  InboundHandlerRegistry,
  acknowledge,
  createFrame,
  matchMetadata,
  matchType,
  noAcknowledgement,
} from 'src/core/messaging';

describe('InboundHandlerRegistry', () => {
  it('dispatches frames to matching operations', () => {
    const registry = new InboundHandlerRegistry();
    const bus = new Bus();
    const handled: string[] = [];

    registry.register({
      id: 'ping',
      filter: matchType('ping'),
      handle: (frame) => {
        handled.push(`ping:${frame.payload}`);
        return acknowledge(2);
      },
    });

    registry.register({
      id: 'local',
      filter: matchMetadata('scope', 'local'),
      handle: (frame) => {
        handled.push(`local:${frame.payload}`);
      },
    });

    const acknowledgement = registry.dispatch(
      createFrame('ping', 'hello', { scope: 'local' }),
      bus,
    );

    expect(handled).toEqual(['ping:hello', 'local:hello']);
    expect(acknowledgement).toEqual({ deliveries: 3, acknowledged: true });
  });

  it('returns a negative acknowledgement when no operation matches', () => {
    const registry = new InboundHandlerRegistry();
    const bus = new Bus();

    const acknowledgement = registry.dispatch(createFrame('missing', 'payload'), bus);

    expect(acknowledgement).toEqual(noAcknowledgement());
  });

  it('prevents duplicate operation identifiers and allows removal', () => {
    const registry = new InboundHandlerRegistry();
    const bus = new Bus();
    const handled: string[] = [];

    const dispose = registry.register({
      id: 'unique',
      filter: matchType('event'),
      handle: (frame) => {
        handled.push(frame.type);
      },
    });

    expect(() =>
      registry.register({
        id: 'unique',
        filter: matchType('event'),
        handle: () => {},
      }),
    ).toThrow('Operation with id "unique" is already registered.');

    dispose();

    registry.dispatch(createFrame('event', 'ignored'), bus);

    expect(handled).toEqual([]);
  });
});
