import { Operation } from '../../messaging/inbound/Operation';

/** Operation that stops the simulation and clears state. */
export const stopOperation: Operation = (player) => {
  player.stop();
  return { status: 'ok' };
};
