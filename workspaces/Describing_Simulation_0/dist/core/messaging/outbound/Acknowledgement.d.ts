export type AcknowledgementStatus = "success" | "error";
export interface Acknowledgement {
    readonly messageId: string;
    readonly status: AcknowledgementStatus;
    readonly error?: string;
    readonly payload?: unknown;
}
export declare const successAck: (messageId: string, payload?: unknown) => Acknowledgement;
export declare const errorAck: (messageId: string, error: string) => Acknowledgement;
