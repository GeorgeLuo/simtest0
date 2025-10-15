import { Bus } from '../Bus';

describe('Bus', () => {
  it('publishes messages to subscribers in order and supports unsubscribe', () => {
    const bus = new Bus<string>();
    const received: string[] = [];

    const unsubscribeA = bus.subscribe((message) => received.push(`A:${message}`));
    bus.subscribe((message) => received.push(`B:${message}`));

    bus.publish('first');
    unsubscribeA();
    bus.publish('second');

    expect(received).toEqual(['A:first', 'B:first', 'B:second']);
  });

  it('allows a subscriber to unsubscribe itself during publish', () => {
    const bus = new Bus<string>();
    const received: string[] = [];

    let unsubscribeA: () => void = () => {};
    unsubscribeA = bus.subscribe((message) => {
      received.push(`A:${message}`);
      unsubscribeA();
    });
    bus.subscribe((message) => received.push(`B:${message}`));

    bus.publish('first');
    bus.publish('second');

    expect(received).toEqual(['A:first', 'B:first', 'B:second']);
  });

  it('does not invoke subscribers added during an active publish', () => {
    const bus = new Bus<number>();
    const received: string[] = [];

    bus.subscribe((message) => {
      received.push(`initial:${message}`);
      bus.subscribe((innerMessage) => received.push(`late:${innerMessage}`));
    });

    bus.publish(1);
    expect(received).toEqual(['initial:1']);

    bus.publish(2);
    expect(received).toEqual(['initial:1', 'initial:2', 'late:2']);
  });

  it('supports reentrant publishes without skipping subscribers', () => {
    const bus = new Bus<number>();
    const received: string[] = [];

    bus.subscribe((message) => {
      received.push(`outer:${message}`);
      if (message === 1) {
        bus.publish(99);
      }
    });
    bus.subscribe((message) => received.push(`second:${message}`));

    bus.publish(1);

    expect(received).toEqual(['outer:1', 'outer:99', 'second:99', 'second:1']);
  });
});
