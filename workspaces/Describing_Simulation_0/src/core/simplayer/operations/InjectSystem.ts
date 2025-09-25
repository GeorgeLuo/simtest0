import { Operation } from '../../messaging/inbound/Operation';

/** Placeholder operation for injecting systems at runtime. */
export const injectSystemOperation: Operation = () => {
  return { status: 'error', message: 'Inject system operation not implemented.' };
};
