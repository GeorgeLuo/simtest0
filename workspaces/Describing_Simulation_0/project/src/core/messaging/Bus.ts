import {
  combineAcknowledgements,
  noAcknowledgement,
  normalizeAcknowledgement,
  type Acknowledgement,
} from './outbound/Acknowledgement';
import { createFrame, type Frame } from './outbound/Frame';
import { matchAll, matchType, type FrameFilter } from './outbound/FrameFilter';
import type { MessageHandler } from './inbound/MessageHandler';

interface Subscriber {
  readonly filter: FrameFilter;
  readonly handler: MessageHandler;
}

/**
 * Lightweight synchronous message bus used by systems inside the simulation.
 *
 * The bus enforces minimal constraints on message shape by working with the
 * {@link Frame} interface. Code that requires stronger typing can extend the
 * frame interface through declaration merging, or narrow frames via
 * {@link FrameFilter}s when subscribing.
 */
export class Bus {
  private readonly subscribers = new Set<Subscriber>();

  subscribe(filter: FrameFilter, handler: MessageHandler): () => void;
  subscribe(type: string, handler: MessageHandler): () => void;
  subscribe(handler: MessageHandler): () => void;
  subscribe(
    filterOrTypeOrHandler: FrameFilter | string | MessageHandler,
    maybeHandler?: MessageHandler,
  ): () => void {
    let filter: FrameFilter;
    let handler: MessageHandler;

    if (typeof filterOrTypeOrHandler === 'string') {
      filter = matchType(filterOrTypeOrHandler);
      handler = maybeHandler as MessageHandler;
    } else if (typeof filterOrTypeOrHandler === 'function' && maybeHandler) {
      filter = filterOrTypeOrHandler as FrameFilter;
      handler = maybeHandler;
    } else {
      filter = matchAll;
      handler = filterOrTypeOrHandler as MessageHandler;
    }

    if (typeof handler !== 'function') {
      throw new Error('A subscriber must provide a handler function.');
    }

    const subscriber: Subscriber = { filter, handler };

    this.subscribers.add(subscriber);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /**
   * Sends a frame through the bus to all subscribers whose filter matches.
   */
  send(frame: Frame): Acknowledgement;
  send<TPayload, TMetadata extends Record<string, unknown> = Record<string, unknown>>(
    type: string,
    payload: TPayload,
    metadata?: Partial<TMetadata>,
  ): Acknowledgement;
  send(
    frameOrType: Frame | string,
    payload?: unknown,
    metadata?: Record<string, unknown>,
  ): Acknowledgement {
    const frame: Frame =
      typeof frameOrType === 'string'
        ? createFrame(frameOrType, payload, metadata)
        : frameOrType;

    const acknowledgements: Acknowledgement[] = [];

    for (const subscriber of this.subscribers) {
      if (subscriber.filter(frame as never)) {
        acknowledgements.push(
          normalizeAcknowledgement(subscriber.handler(frame as never, this)),
        );
      }
    }

    if (acknowledgements.length === 0) {
      return noAcknowledgement();
    }

    return combineAcknowledgements(acknowledgements);
  }
}
