import { Player } from "./Player.js";
import { IdentityFrameFilter, } from "./messaging/outbound/FrameFilter.js";
import { errorAck } from "./messaging/outbound/Acknowledgement.js";
export class IOPlayer extends Player {
    unsubscribeInbound;
    frameFilter;
    constructor(options) {
        const { entityManager, componentManager, systemManager, inboundBus, outboundBus, inboundRegistry, frameFilter, } = options;
        super(entityManager, componentManager, systemManager);
        this.outboundBus = outboundBus;
        this.inboundRegistry = inboundRegistry;
        this.frameFilter = frameFilter ?? new IdentityFrameFilter();
        this.unsubscribeInbound = inboundBus.subscribe((message) => {
            void this.handleInbound(message);
        });
    }
    outboundBus;
    inboundRegistry;
    dispose() {
        this.unsubscribeInbound();
    }
    onAfterStep() {
        this.emitFrame();
    }
    async handleInbound(message) {
        const handler = this.inboundRegistry.get(message.type);
        if (!handler) {
            this.outboundBus.publish({
                type: "acknowledgement",
                acknowledgement: errorAck(message.id, `No handler registered for message type '${message.type}'`),
            });
            return;
        }
        const acknowledgement = await handler.handle(this, message);
        this.outboundBus.publish({
            type: "acknowledgement",
            acknowledgement,
        });
    }
    emitFrame() {
        const entities = [];
        this.entityManager.forEachEntity((entity) => {
            const serializedComponents = [];
            this.componentManager.forEachComponent(entity, (component) => {
                serializedComponents.push({
                    type: component.type.key,
                    data: component.data,
                });
            });
            entities.push({
                id: entity,
                components: serializedComponents,
            });
        });
        const frame = {
            tick: this.getTick(),
            entities,
        };
        const filtered = this.frameFilter.apply(frame);
        this.outboundBus.publish({
            type: "frame",
            frame: filtered,
        });
    }
}
