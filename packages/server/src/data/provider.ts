import { IDataProvider, IDataValue } from "./types";

export abstract class ProviderBase<TValue extends IDataValue<unknown>> implements IDataProvider<TValue> {
    public readonly identifier: string;
    public readonly name: string;
    public readonly priority: number;

    protected readonly rootPath: string;
    protected readonly cache = new Map<string, TValue>();
    private listeners: Array<() => void> = [];

    constructor(identifier: string, name: string, priority: number, rootPath: string) {
        this.identifier = identifier;
        this.name = name;
        this.priority = priority;
        this.rootPath = rootPath;
    }

    public abstract load(): Promise<void>;

    public has(key: string): boolean {
        return this.cache.has(key);
    }

    public get(key: string): TValue | undefined {
        return this.cache.get(key);
    }

    // TODO: Add this to the provider interface?
    public getValue(key: string): TValue["value"] | undefined {
        return this.cache.get(key)?.value;
    }

    public getAll(): Iterable<[string, TValue]> {
        return this.cache.entries();
    }

    public onDidChange(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((listened) => listened !== listener);
        };
    }

    /**
     * TODO: Call from file-watcher to trigger incremental rebuilds.
     */
    public notifyChanged(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }

    //#region Helper

    // private add(entry: [string, TValue]): void {
    //     const [key, value] = entry;
    //     this.cache.set(key, value);
    // }

    // private addEach(entries: Array<[string, TValue]>): void {
    //     for (const [key, entry] of entries) {
    //         this.add([key, entry]);
    //     }
    // }

    // private remove(entry: [string, TValue]): void {
    //     const [key, value] = entry;
    //     this.cache.delete(key);
    // }

    // private removeEach(entries: Array<[string, TValue]>): void {
    //     for (const [key, entry] of entries) {
    //         this.remove([key, entry]);
    //     }
    // }

    // private clear(): void {
    //     this.cache.clear();
    // }

    // //#endregion

    // //#region Logging

    // protected logLoadComplete(itemCount: number, itemType: string): void {
    //     console.log(`${this.constructor.name}: Loaded ${itemCount} ${itemType} for '${this.identifier}'`);
    // }

    //#endregion
}
