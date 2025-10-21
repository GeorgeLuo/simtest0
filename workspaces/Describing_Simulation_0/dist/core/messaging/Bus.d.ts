export type BusCallback<T> = (payload: T) => void;
export declare class Bus<T> {
    private readonly listeners;
    private readonly snapshot;
    private nextId;
    subscribe(callback: BusCallback<T>): () => void;
    publish(payload: T): void;
}
