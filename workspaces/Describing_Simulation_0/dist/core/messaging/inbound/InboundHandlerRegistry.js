export class InboundHandlerRegistry {
    handlers = new Map();
    register(type, handler) {
        this.handlers.set(type, handler);
    }
    get(type) {
        return this.handlers.get(type);
    }
}
