// Defines shared contracts for message handlers in the ECS messaging subsystem.

/**
 * Maps message type identifiers to the payload shape their handlers expect.
 *
 * The map keys are string literal message identifiers and the value is the
 * payload type each message must carry when dispatched through the bus.
 */
export type MessageTypeMap = Record<string, unknown>;

/**
 * A strongly-typed callback for a specific message type.
 *
 * @template TMessages The collection of message payload definitions.
 * @template TType The message identifier handled by this callback.
 */
export type MessageHandler<
  TMessages extends MessageTypeMap,
  TType extends keyof TMessages,
> = (payload: Readonly<TMessages[TType]>) => void;

/**
 * Function returned by subscriptions to allow callers to unregister.
 */
export type MessageDisposer = () => void;
