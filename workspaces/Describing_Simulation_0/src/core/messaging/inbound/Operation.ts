import type { SystemContext } from '../../systems/System';

export interface Operation<TContext = SystemContext, TPayload = unknown> {
  execute(_context: TContext, _payload: TPayload): void;
}
