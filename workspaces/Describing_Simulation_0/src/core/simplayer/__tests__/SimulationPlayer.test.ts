import { SimulationPlayer, SimulationMessageType } from '../SimulationPlayer';
import { EntityManager } from '../../entity/EntityManager';
import { ComponentManager } from '../../components/ComponentManager';
import { SystemManager } from '../../systems/SystemManager';
import { Bus } from '../../messaging/Bus';
import { FrameFilter } from '../../messaging/outbound/FrameFilter';
import { System } from '../../systems/System';

class NoopSystem extends System {
  override update(): void {
    /* intentionally empty */
  }
}

describe('SimulationPlayer', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('registers default inbound handlers and publishes acknowledgements', () => {
    jest.useFakeTimers({ advanceTimers: true });

    const entityManager = new EntityManager();
    const componentManager = new ComponentManager();
    const systemManager = new SystemManager(entityManager, componentManager);
    const inboundBus = new Bus<any>();
    const outboundBus = new Bus<any>();
    const frameFilter = new FrameFilter();
    const player = new SimulationPlayer(systemManager, inboundBus, outboundBus, frameFilter, undefined, 5);

    const acknowledgements: any[] = [];
    outboundBus.subscribe((message) => {
      if (message && typeof message === 'object' && 'status' in message) {
        acknowledgements.push(message);
      }
    });

    const noopSystem = new NoopSystem();
    inboundBus.publish({
      type: SimulationMessageType.INJECT_SYSTEM,
      payload: { messageId: 'inject-1', system: noopSystem },
    });

    inboundBus.publish({
      type: SimulationMessageType.START,
      payload: { messageId: 'start-1' },
    });

    jest.advanceTimersByTime(15);

    expect(acknowledgements).toEqual(
      expect.arrayContaining([
        { messageId: 'inject-1', status: 'success' },
        { messageId: 'start-1', status: 'success' },
      ]),
    );
  });
});
