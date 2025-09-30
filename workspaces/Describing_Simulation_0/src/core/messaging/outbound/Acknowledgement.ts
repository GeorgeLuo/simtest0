/**
 * Represents the response to an inbound message, indicating success or error.
 */
export class Acknowledgement<TPayload = unknown> {
  private constructor(
    public readonly id: string,
    public readonly success: boolean,
    public readonly payload?: TPayload,
    public readonly error?: string
  ) {}

  static success<TPayload>(id: string, payload?: TPayload): Acknowledgement<TPayload> {
    return new Acknowledgement(id, true, payload);
  }

  static error(id: string, error: string): Acknowledgement<undefined> {
    return new Acknowledgement(id, false, undefined, error);
  }
}
