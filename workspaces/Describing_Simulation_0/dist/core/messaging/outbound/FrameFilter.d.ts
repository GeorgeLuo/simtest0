import { Frame } from "./Frame.js";
export interface FrameFilter {
    apply(frame: Frame): Frame;
}
export declare class IdentityFrameFilter implements FrameFilter {
    apply(frame: Frame): Frame;
}
