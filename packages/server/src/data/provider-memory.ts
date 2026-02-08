import { IDataProvider, KeyType } from "./types";

type ValueRecord = {
    value: Record<string, unknown>;
    sourcePath: string;
};

/**
 * @deprecated This was only used as a test-bed example for developing the provider/root system.
 */
class InMemoryProvider implements IDataProvider<Record<string, unknown>> {
    public identifier: string;
    public name: string;
    public priority: number;

    private data = new Map<KeyType, ValueRecord>();
    private listeners: Array<() => void> = [];

    constructor(identifier: string, name: string, priority: number, entries: Array<[KeyType, ValueRecord]>) {
        this.identifier = identifier;
        this.name = name;
        this.priority = priority;

        for (const [key, entry] of entries) {
            this.data.set(key, entry);
        }
    }

    public async load(): Promise<void> {
        // No-op for in-memory example
    }

    public has(key: KeyType): boolean {
        return this.data.has(key);
    }

    public get(key: KeyType): Record<string, unknown> | undefined {
        return this.data.get(key)?.value;
    }

    public getAll(): Iterable<[KeyType, ValueRecord]> {
        return this.data.entries();
    }

    public onDidChange(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((listened) => listened !== listener);
        };
    }

    public simulateChange(key: KeyType, value: ValueRecord): void {
        this.data.set(key, value);
        for (const listener of this.listeners) {
            listener();
        }
    }
}
