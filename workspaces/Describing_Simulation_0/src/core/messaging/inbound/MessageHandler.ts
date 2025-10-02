import type { Operation } from "./Operation";

export class MessageHandler<TContext, TMessage, TResponse> {
  constructor(
    private readonly operations: ReadonlyArray<Operation<TContext, TMessage>>,
    private readonly respond: (message: TMessage, result: unknown) => TResponse,
  ) {}

  async handle(context: TContext, message: TMessage): Promise<TResponse> {
    let result: unknown;
    for (const operation of this.operations) {
      result = await operation.execute(context, message);
    }

    return this.respond(message, result);
  }
}
