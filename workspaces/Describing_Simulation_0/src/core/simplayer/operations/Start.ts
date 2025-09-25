import { Operation } from '../../messaging/inbound/Operation';

/** Operation that triggers the start lifecycle on the player. */
export const startOperation: Operation = (player) => {
  player.start();
  return { status: 'ok' };
};
