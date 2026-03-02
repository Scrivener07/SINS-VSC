import { DataType } from "./cache-data";
import { ManifestType } from "./cache-manifest";
import { UniformType } from "./cache-uniform";

/**
 * @deprecated
 */
export class CacheStorage<T extends DataType | ManifestType | UniformType> {
    protected cache = new Map<keyof T, Set<string>>();

    public set<K extends keyof T>(cache: K, items: Set<string>) {
        this.cache.set(cache, new Set(items));
    }

    public get<K extends keyof T>(cache: K): Set<string> {
        if (!this.cache.has(cache)) {
            this.cache.set(cache, new Set<string>());
        }
        return this.cache.get(cache)!;
    }

    public size(): number {
        let size: number = 0;
        for (const cache of this.cache.values()) {
            size += cache.size;
        }
        return size;
    }

    public clear(): void {
        for (const cache of this.cache.values()) {
            cache.clear();
        }
    }
}
