import { Acknowledgement } from "./Acknowledgement.js";
import { Frame } from "./Frame.js";
export type OutboundMessage = {
    readonly type: "frame";
    readonly frame: Frame;
} | {
    readonly type: "acknowledgement";
    readonly acknowledgement: Acknowledgement;
};
