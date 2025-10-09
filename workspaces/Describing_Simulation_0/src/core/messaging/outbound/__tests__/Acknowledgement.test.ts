import type { Acknowledgement } from '../Acknowledgement';

describe('Acknowledgement', () => {
  it('describes success acknowledgement shape', () => {
    const acknowledgement: Acknowledgement = {
      messageId: 'msg-1',
      status: 'success',
    };

    expect(acknowledgement).toEqual({ messageId: 'msg-1', status: 'success' });
  });

  it('describes error acknowledgement with detail', () => {
    const acknowledgement: Acknowledgement = {
      messageId: 'msg-2',
      status: 'error',
      detail: 'Failure reason',
    };

    expect(acknowledgement.detail).toBe('Failure reason');
  });
});
