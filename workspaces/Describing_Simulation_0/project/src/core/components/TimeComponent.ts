import { ComponentType } from './ComponentType';

/**
 * Component tracking the accumulated simulation time in seconds.
 */
export interface TimeComponent {
  /** Total elapsed simulation time in seconds. */
  elapsed: number;
}

/** Identifier for the shared {@link TimeComponent} instance. */
export const TIME_COMPONENT = new ComponentType<TimeComponent>('time');

