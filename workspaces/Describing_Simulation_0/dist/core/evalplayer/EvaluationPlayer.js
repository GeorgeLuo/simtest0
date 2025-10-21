import { ComponentType } from "../components/ComponentType.js";
import { IOPlayer } from "../IOPlayer.js";
import { MessageHandler } from "../messaging/inbound/MessageHandler.js";
import { InjectFrameOperation } from "./operations/InjectFrame.js";
import { EVALUATION_FRAME_MESSAGE } from "./messages.js";
export { EVALUATION_FRAME_MESSAGE } from "./messages.js";
export const EVALUATION_FRAME_COMPONENT = new ComponentType("evaluation.frame.component");
export class EvaluationPlayer extends IOPlayer {
    constructor(options) {
        super(options);
        this.registerFrameHandler(options.inboundRegistry);
    }
    ingestFrame(frame) {
        const entity = this.entityManager.createEntity();
        this.componentManager.addComponent(entity, EVALUATION_FRAME_COMPONENT, frame);
        this.publishEvaluations();
    }
    publishEvaluations() {
        const entities = this.componentManager.getEntitiesWithComponent(EVALUATION_FRAME_COMPONENT);
        const latestEntity = entities.at(-1);
        if (!latestEntity) {
            return;
        }
        const latestFrame = this.componentManager.getComponent(latestEntity, EVALUATION_FRAME_COMPONENT);
        if (!latestFrame) {
            return;
        }
        const filtered = this.frameFilter.apply(latestFrame);
        this.outboundBus.publish({
            type: "frame",
            frame: filtered,
        });
    }
    registerFrameHandler(registry) {
        const handler = new MessageHandler([new InjectFrameOperation()]);
        registry.register(EVALUATION_FRAME_MESSAGE, handler);
    }
}
