import { Operation } from '../../messaging/inbound/Operation';

/** Operation that pauses the simulation loop. */
export const pauseOperation: Operation = (player) => {
  player.pause();
  return { status: 'ok' };
};
