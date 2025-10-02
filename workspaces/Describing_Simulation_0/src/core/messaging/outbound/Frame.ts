import type { ComponentType } from "../../components/ComponentType";

export interface FrameEntity {
  id: number;
  components: Record<string, unknown>;
}

export interface Frame {
  tick: number;
  entities: FrameEntity[];
}

export type FrameComponentFilter = (type: ComponentType<unknown>, value: unknown) => boolean;
