# Outbound Messaging Notes

- `OutboundMessageBus` supports a single listener and relays pushed messages directly.
- `OutboundMessageSystem` sends messages for entities with `OutboundMessageComponent` and removes those entities.
- `OutboundMessageType` currently defines `data` and `exit` message categories.
