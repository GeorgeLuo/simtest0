import { MessageHandler } from "./MessageHandler.js";
export declare class InboundHandlerRegistry {
    private readonly handlers;
    register(type: string, handler: MessageHandler): void;
    get(type: string): MessageHandler | undefined;
}
