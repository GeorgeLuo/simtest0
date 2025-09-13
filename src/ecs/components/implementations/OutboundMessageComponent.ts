/** ComponentType for outbound messages */
import { ComponentType } from '../ComponentType.js';
import { OutboundMessageType } from '../../messaging/OutboundMessageType.js';

export interface OutboundMessageData {
  type: OutboundMessageType;
  payload: any;
}

export const OutboundMessageComponent = new ComponentType('outboundMessage', { type: 'string', payload: 'object' });
