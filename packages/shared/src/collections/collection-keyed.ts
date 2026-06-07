export abstract class KeyedCollection<TKey, TItem> {
    protected readonly collection: Map<TKey, TItem>;

    constructor(items?: Iterable<TItem>) {
        this.collection = new Map<TKey, TItem>();
        if (items) {
            for (const item of items) {
                this.add(item);
            }
        }
    }

    /**
     * Extracts a key from the given element.
     * @param item The item to extract the key from.
     * @returns The key corresponding to the given item.
     */
    protected abstract getKeyForItem(item: TItem): TKey;

    //#region Iterability

    [Symbol.iterator](): Iterator<TItem> {
        return this.collection.values();
    }

    public keys(): MapIterator<TKey> {
        return this.collection.keys();
    }

    public entries(): MapIterator<[TKey, TItem]> {
        return this.collection.entries();
    }

    //#endregion

    //#region Lookup

    public get count(): number {
        return this.collection.size;
    }

    public get(key: TKey): TItem | undefined {
        return this.collection.get(key);
    }

    public has(key: TKey): boolean {
        return this.collection.has(key);
    }

    public contains(item: TItem): boolean {
        const key: TKey = this.getKeyForItem(item);
        return this.collection.has(key);
    }

    //#endregion

    //#region Mutation

    public add(item: TItem): void {
        const key: TKey = this.getKeyForItem(item);
        this.collection.set(key, item);
    }

    public remove(item: TItem): void {
        const key: TKey = this.getKeyForItem(item);
        this.collection.delete(key);
    }

    public clear(): void {
        this.collection.clear();
    }

    //#endregion

    //#region Query

    public find(predicate: (item: TItem) => boolean): TItem | undefined {
        for (const item of this.collection.values()) {
            if (predicate(item)) {
                return item;
            }
        }
        return undefined;
    }

    public filter(predicate: (item: TItem) => boolean): TItem[] {
        const results: TItem[] = [];
        for (const item of this.collection.values()) {
            if (predicate(item)) {
                results.push(item);
            }
        }
        return results;
    }

    public forEach(callback: (item: TItem, key: TKey) => void): void {
        this.collection.forEach((item, key) => callback(item, key));
    }

    public map<TResult>(callback: (item: TItem, key: TKey) => TResult): TResult[] {
        const results: TResult[] = [];
        for (const [key, item] of this.collection) {
            results.push(callback(item, key));
        }
        return results;
    }

    public toArray(): TItem[] {
        return Array.from(this.collection.values());
    }

    //#endregion
}
