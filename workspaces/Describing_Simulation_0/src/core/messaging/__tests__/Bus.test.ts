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
});
