import { describe, expect, it } from 'vitest';
import { Acknowledgement } from '../../../../src/core/messaging/outbound/Acknowledgement';

describe('Acknowledgement', () => {
  it('creates success acknowledgements with message id and optional payload', () => {
    const ack = Acknowledgement.success('123', { status: 'ok' });

    expect(ack.id).toBe('123');
    expect(ack.success).toBe(true);
    expect(ack.payload).toEqual({ status: 'ok' });
    expect(ack.error).toBeUndefined();
  });

  it('creates error acknowledgements with error details', () => {
    const ack = Acknowledgement.error('456', 'Failure');

    expect(ack.id).toBe('456');
    expect(ack.success).toBe(false);
    expect(ack.error).toBe('Failure');
    expect(ack.payload).toBeUndefined();
  });
});
