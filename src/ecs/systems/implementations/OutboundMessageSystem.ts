/** System sending outbound messages */
import { System } from '../System.js';
import { OutboundMessageBus } from '../../messaging/OutboundMessageBus.js';
import { EntityManager } from '../../entity/EntityManager.js';
import { ComponentManager } from '../../components/ComponentManager.js';
import { OutboundMessageComponent, OutboundMessageData } from '../../components/implementations/OutboundMessageComponent.js';

export class OutboundMessageSystem extends System {
  private bus: OutboundMessageBus;

  constructor(bus: OutboundMessageBus) {
    super();
    this.bus = bus;
  }

  update(em: EntityManager, cm: ComponentManager): void {
    const entities = cm.getEntitiesWithComponent(OutboundMessageComponent);
    for (const e of entities) {
      const comp = cm.getComponent(e, OutboundMessageComponent) as OutboundMessageData | undefined;
      if (comp) {
        this.bus.push({ type: comp.type, payload: comp.payload });
      }
      em.removeEntity(e);
    }
  }
}
