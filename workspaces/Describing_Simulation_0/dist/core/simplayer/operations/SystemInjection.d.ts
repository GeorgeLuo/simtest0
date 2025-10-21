import { IOPlayer } from "../../IOPlayer.js";
import { InboundMessage } from "../../messaging/inbound/InboundMessage.js";
import { Operation } from "../../messaging/inbound/Operation.js";
import { InjectSystemPayload } from "../SimulationPlayer.js";
export declare class InjectSystemOperation implements Operation<InjectSystemPayload> {
    execute(player: IOPlayer, message: InboundMessage<InjectSystemPayload>): Promise<void>;
}
export declare class EjectSystemOperation implements Operation<{
    id: string;
}> {
    execute(player: IOPlayer, message: InboundMessage<{
        id: string;
    }>): Promise<void>;
}
