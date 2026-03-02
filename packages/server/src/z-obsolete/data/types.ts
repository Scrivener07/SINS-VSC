/* Core Concepts
- IDataProvider: loads a root directory and exposes read access + change token.
- ProviderChain: ordered list (base to mods in load order).
- ConfigurationRoot: unified API that queries providers from last to first.
- ResolutionResult: value + provenance (which provider, which file).
- Overlay Policies: allow "last wins" but still track all layers.
*/

/* Core Types
- Provider = one root directory (base game or mod).
- Root = ordered provider chain.
- Resolver = "last wins" + provenance.
- Overlay policy = per‑key or per‑type merge strategy (replace vs patch).
*/

/* Responsibilities
- Providers know how to parse and cache their source.
- Root handles ordering, reload, and queries.
- Resolvers handle merging and provenance.
*/

/* Overlay Policies
These are the possible merge strategies for data types.
This project will only use the replace strategy for simplicity.
- Replace: mod entry fully replaces base.
- Patch/Merge: mod entry only overrides specified fields.
- Custom: entity specific rules (arrays by id).
*/

/* Query Resolution
- Normal Query: iterate providers by priority (highest first), return first match + provenance.
- Layer Access: return list of all matches.
- Merged Query (optional): fold from low-to-high using policy.
*/

/* Live Reload
Each provider watches its root and triggers `onDidChange`, which:
- reloads only that provider, and
- invalidates the root’s merged cache.
*/

/*
Using Replace-only for the overlay policy + eager cache.

Proposed Shape
- Provider: loads its root, exposes key→value map, raises change events.
- Root/Registry: maintains ordered providers + eager merged cache (last provider wins).
- Provenance Table: key to {providerId, sourcePath, isOverride}.
- Layer Access: provider specific queries still possible.

Eager merge flow
1. Load all providers in priority order (base to mods).
2. Merge into `mergedCache`: `mergedCache[key] = value` (overwrites).
3. Track provenance: if key already existed, mark `isOverride=true`.
4. On provider change: rebuild only that provider, then rebuild merged cache (or incremental if you track per-provider keys).
*/

/* TODO
- Add change token wiring and an incremental rebuild strategy to avoid full rebuild on every provider update.
- Remove the double loop in `recomputeKeys`, and wire `sourcePath` correctly.
*/

//#region Providers

/**
 * @deprecated
 * Base interface for all wrapped values that include provenance.
 */
export interface IDataValue<T> {
    value: T;
    sourcePath: string;
}

/** @deprecated */
export type ValueString = IDataValue<string>;

/** @deprecated */
export type ValueStringArray = IDataValue<string[]>;

/** @deprecated */
export type ValueStringSet = IDataValue<Set<string>>;

/** @deprecated */
export type IProvenance = Omit<IResolution<unknown>, "key" | "item">;

/**
 * @deprecated
 * Represents a resolved value for a given key.
 */
export interface IResolution<T> {
    key: string;
    item: T;
    providerId: string;
    sourcePath: string;
    isOverride: boolean;
}

/**
 * @deprecated
 * Represents a provider that loads data from a source such as a directory on disk.
 */
export interface IDataProvider<T> {
    /**
     * Unique identifier for the provider, used for provenance and management.
     *
     * Note: stable identifier (path or mod identifier)
     *
     * @see {@link IDataProvider}
     */
    identifier: string;

    /**
     * A human friendly name for debugging and provenance reporting.
     * @see {@link IDataProvider}
     */
    name: string;

    /**
     * Priority for conflict resolution. Higher values take precedence over lower ones.
     * @see {@link IDataProvider}
     */
    priority: number;

    /**
     * Loads the provider's data and builds its internal cache. This should be called before querying the provider.
     * @see {@link IDataProvider}
     */
    load(): Promise<void>;

    /**
     * Retrieves the value for a given key from this provider, if it exists.
     * @param key The key to query.
     * @returns The value associated with the key, or undefined if not found.
     * @see {@link IDataProvider}
     */
    get(key: string): T | undefined;

    /**
     * Checks if the provider has a value for the given key.
     * @param key The key to check.
     * @returns True if the key exists in this provider, false otherwise.
     * @see {@link IDataProvider}
     */
    has(key: string): boolean;

    /**
     * Returns an iterable of all key→value pairs in this provider, along with their source paths for provenance tracking.
     * This is used by the root to build the merged cache and provenance table.
     * @returns An iterable of `[key, { value, sourcePath }]` entries.
     * @see {@link IDataProvider}
     */
    getAll(): Iterable<[string, T]>;

    /**
     * Registers a listener that is called whenever the provider's underlying data changes.
     * This allows the root to react to changes and rebuild its merged cache.
     * A change could be triggered by a file watcher detecting modifications in the provider's root directory.
     * @param listener The callback to invoke on data change.
     * @see {@link IDataProvider}
     */
    onDidChange(listener: () => void): () => void;
}

/**
 * @deprecated
 * Represents a data root that maintains a list of providers and a merged cache of key→value.
 * The root is responsible for managing providers, handling reloads, and resolving queries with provenance.
 */
export interface IDataRoot<T> {
    /**
     * Adds a provider to the root.
     * Providers are ordered by their priority, with higher priority providers taking precedence over lower ones.
     * @param provider The provider to add.
     * @see {@link IDataRoot}
     */
    addProvider(provider: IDataProvider<T>): void;

    /**
     * Removes a provider by its ID.
     * This will cause the root to rebuild its merged cache without the removed provider's data.
     * @param identifier The ID of the provider to remove.
     * @see {@link IDataRoot}
     */
    removeProvider(identifier: string): void;

    /**
     * Reloads all providers and rebuilds the merged cache.
     * This is typically called after a provider signals a change.
     * @see {@link IDataRoot}
     */
    reloadAll(): Promise<void>;

    /**
     * Reloads a specific provider by its ID and rebuilds the merged cache.
     * @param identifier The ID of the provider to reload.
     * @see {@link IDataRoot}
     */
    reloadProvider(identifier: string): Promise<void>;

    /**
     * Retrieves the resolved value for a given key, along with provenance information about which provider contributed the value and whether it was overridden.
     * @param key The key to query.
     * @returns An object containing the resolved value and provenance, or undefined if the key is not found in any provider.
     * @see {@link IDataRoot}
     */
    get(key: string): IResolution<T> | undefined;

    /**
     * Retrieves all layers of values for a given key across all providers, ordered from lowest to highest priority.
     * Each layer includes provenance information.
     * @param key The key to query.
     * @returns An array of resolution objects for each provider that defines the key, ordered from lowest to highest priority.
     * @see {@link IDataRoot}
     */
    getLayers(key: string): IResolution<T>[];
}

//#endregion

//#region Merge Strategies

/**
 * @deprecated
 * Defines how values are merged when multiple providers contribute the same key.
 */
export interface IMergeStrategy<T> {
    /**
     * Merges a new value into an existing value.
     * @see {@link IMergeStrategy}
     */
    merge(existing: T, incoming: T): T;
}

/**
 * @deprecated
 * Last provider wins. The incoming value completely replaces the existing value.
 */
export class ReplaceMerge<T> implements IMergeStrategy<T> {
    public merge(existing: T, incoming: T): T {
        return incoming;
    }
}

/**
 * @deprecated
 * Concatenates arrays from all providers.
 */
export class ConcatMerge<T> implements IMergeStrategy<T[]> {
    public merge(existing: T[], incoming: T[]): T[] {
        return [...existing, ...incoming];
    }
}

/** @deprecated */
export class ConcatMergeValueStringArray implements IMergeStrategy<ValueStringArray> {
    public merge(existing: ValueStringArray, incoming: ValueStringArray): ValueStringArray {
        return {
            value: [...existing.value, ...incoming.value],
            sourcePath: incoming.sourcePath // Use the last provider's sourcePath
        };
    }
}

/**
 * @deprecated
 * Unions sets from all providers.
 */
export class UnionMerge<T> implements IMergeStrategy<Set<T>> {
    public merge(existing: Set<T>, incoming: Set<T>): Set<T> {
        const result: Set<T> = new Set(existing);
        for (const item of incoming) {
            result.add(item);
        }
        return result;
    }
}

/** @deprecated */
export class UnionMergeValueSetString implements IMergeStrategy<ValueStringSet> {
    public merge(existing: ValueStringSet, incoming: ValueStringSet): ValueStringSet {
        const result = new Set(existing.value);
        for (const item of incoming.value) {
            result.add(item);
        }
        return {
            value: result,
            sourcePath: incoming.sourcePath // Use the last provider's sourcePath.
        };
    }
}

//#endregion
