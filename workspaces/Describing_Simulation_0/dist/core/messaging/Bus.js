export class Bus {
    listeners = new Map();
    snapshot = [];
    nextId = 1;
    subscribe(callback) {
        const token = this.nextId++;
        this.listeners.set(token, callback);
        return () => {
            this.listeners.delete(token);
        };
    }
    publish(payload) {
        if (this.listeners.size === 0) {
            return;
        }
        this.snapshot.length = 0;
        for (const callback of this.listeners.values()) {
            this.snapshot.push(callback);
        }
        for (let index = 0; index < this.snapshot.length; index += 1) {
            this.snapshot[index](payload);
        }
    }
}
