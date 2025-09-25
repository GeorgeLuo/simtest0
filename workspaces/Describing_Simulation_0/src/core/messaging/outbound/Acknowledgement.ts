/** Response emitted after processing an inbound operation. */
export interface Acknowledgement {
  status: 'ok' | 'error';
  message?: string;
}
