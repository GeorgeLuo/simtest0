export interface Operation<TContext, TMessage> {
  execute(context: TContext, message: TMessage): Promise<unknown> | unknown;
}
