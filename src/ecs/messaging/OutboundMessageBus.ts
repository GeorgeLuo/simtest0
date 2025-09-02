/** OutboundMessageBus with single listener */
import { OutboundMessageType } from './OutboundMessageType.js';

export interface OutboundMessage {
  type: OutboundMessageType;
  payload: any;
}

export class OutboundMessageBus {
  private listener?: (msg: OutboundMessage) => void;

  subscribe(listener: (msg: OutboundMessage) => void): void {
    if (this.listener) {
      throw new Error('Listener already registered');
    }
    this.listener = listener;
  }

  push(message: OutboundMessage): void {
    if (this.listener) {
      this.listener(message);
    }
  }
}
