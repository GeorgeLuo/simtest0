// Test intents:
// - Bus subscriptions deliver frames according to their filters and can be removed.
// - Acknowledgement helpers report delivery counts and normalization.
// - Frame filters support type and metadata based routing.

import {
  Bus,
  acknowledge,
  combineAcknowledgements,
  createFrame,
  matchAnyType,
  matchMetadata,
  matchType,
  noAcknowledgement,
  normalizeAcknowledgement,
} from 'src/core/messaging';

describe('Bus', () => {
  it('delivers frames to matching subscribers and supports unsubscribe', () => {
    const bus = new Bus();
    const deliveries: string[] = [];

    const unsubscribe = bus.subscribe(matchType('ping'), (frame) => {
      deliveries.push(`ping:${frame.payload}`);
    });

    bus.subscribe((frame) => {
      deliveries.push(`any:${frame.type}`);
    });

    const firstAck = bus.send('ping', 'first');

    expect(firstAck).toEqual({ deliveries: 2, acknowledged: true });
    expect(deliveries).toEqual(['ping:first', 'any:ping']);

    unsubscribe();

    const secondAck = bus.send(createFrame('ping', 'second'));

    expect(secondAck).toEqual({ deliveries: 1, acknowledged: true });
    expect(deliveries).toEqual(['ping:first', 'any:ping', 'any:ping']);
  });

  it('returns a negative acknowledgement when no subscribers match', () => {
    const bus = new Bus();

    const acknowledgement = bus.send('unknown', {});

    expect(acknowledgement).toEqual(noAcknowledgement());
  });
});

describe('Acknowledgements', () => {
  it('normalizes optional values into acknowledged deliveries', () => {
    expect(normalizeAcknowledgement()).toEqual({ deliveries: 1, acknowledged: true });

    const explicit = normalizeAcknowledgement(acknowledge(5));
    expect(explicit).toEqual({ deliveries: 5, acknowledged: true });
  });

  it('combines acknowledgements by summing deliveries', () => {
    const combined = combineAcknowledgements([
      acknowledge(2),
      noAcknowledgement(),
      acknowledge(1),
    ]);

    expect(combined).toEqual({ deliveries: 3, acknowledged: true });
  });
});

describe('Frame filters', () => {
  it('matchAnyType routes frames to subscribers interested in multiple types', () => {
    const bus = new Bus();
    const received: string[] = [];

    bus.subscribe(matchAnyType('alpha', 'beta'), (frame) => {
      received.push(frame.type);
    });

    bus.send('alpha', {});
    bus.send('gamma', {});
    bus.send('beta', {});

    expect(received).toEqual(['alpha', 'beta']);
  });

  it('matchMetadata filters frames using metadata equality checks', () => {
    const bus = new Bus();
    const received: string[] = [];

    bus.subscribe(matchMetadata('scope', 'local'), (frame) => {
      received.push(frame.payload as string);
    });

    bus.send('event', 'first', { scope: 'local' });
    bus.send('event', 'second', { scope: 'remote' });

    expect(received).toEqual(['first']);
  });
});
