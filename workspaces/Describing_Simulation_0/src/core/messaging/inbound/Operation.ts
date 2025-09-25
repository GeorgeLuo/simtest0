import { Player } from '../../Player';
import { Acknowledgement } from '../outbound/Acknowledgement';

export interface OperationPayload {
  [key: string]: unknown;
}

export type Operation = (player: Player, payload: OperationPayload) => Acknowledgement;
