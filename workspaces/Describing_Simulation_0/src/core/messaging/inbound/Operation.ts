import type { SystemContext } from '../../systems/System';
import type { Acknowledgement } from '../outbound/Acknowledgement';

export interface Operation<TContext = SystemContext, TPayload = unknown> {
  execute(context: TContext, payload: TPayload): Acknowledgement;
}
