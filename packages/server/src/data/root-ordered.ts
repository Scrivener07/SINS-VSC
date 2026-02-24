import { IDataRoot, IDataProvider, IMergeStrategy, IProvenance, IResolution, IDataValue } from "./types";

/**
 * Provides a root-configuration implementation with eager merge algorithm (replace-only).
 * Maintains an ordered list of providers and a merged cache of key→value.
 *
 * #### Summary
 * The `OrderedRoot` maintains an ordered list of providers and a merged cache of key→value.
 * On any provider change, it rebuilds the merged cache by iterating providers in priority order.
 * It also tracks provenance for each key to know which provider contributed the value and if it was overridden.
 *
 * #### Provenance
 * Tracks provenance for each key to know which provider contributed the value and if it was overridden.
 *
 * #### Incremental Recomputation
 * Supports incremental recomputation: on provider change, only affected keys are recomputed.
 * This avoids full rebuild by tracking which keys each provider contributes, then recomputes only those keys when that provider changes.
 *
 * #### Merge Strategies
 * The merge behavior is determined by the provided {@link IMergeStrategy}.
 * - Use {@link ReplaceMerge} for last-wins (textures).
 * - Use {@link ConcatMerge} for array concatenation (file index).
 * - Use {@link UnionMerge} for set union (entity identifiers).
 */
export class OrderedRoot<T extends IDataValue<unknown>> implements IDataRoot<T> {
    /** The merge strategy to use for combining provider values. */
    private readonly mergeStrategy: IMergeStrategy<T>;

    /** The list of providers, ordered by priority (low to high). */
    private providers: IDataProvider<T>[] = [];

    /** The merged cache of key→value. */
    private merged = new Map<string, T>();

    /** The provenance information for each key. */
    private provenance = new Map<string, IProvenance>();

    /** Tracks which keys each provider contributes, for incremental recomputation. */
    private providerKeys = new Map<string, Set<string>>();

    /** Tracks change event unsubscribe functions per provider. */
    private providerUnsubscribe = new Map<string, () => void>();

    constructor(mergeStrategy: IMergeStrategy<T>) {
        this.mergeStrategy = mergeStrategy;
    }

    public addProvider(provider: IDataProvider<T>): void {
        this.providers.push(provider);
        this.sort();

        const unsubscribe = provider.onDidChange(async () => {
            await this.reloadProvider(provider.identifier);
        });
        this.providerUnsubscribe.set(provider.identifier, unsubscribe);
    }

    public removeProvider(identifier: string): void {
        const unsubscribe = this.providerUnsubscribe.get(identifier);
        if (unsubscribe) {
            unsubscribe();
            this.providerUnsubscribe.delete(identifier);
        }

        this.providers = this.providers.filter((provider) => provider.identifier !== identifier);

        const keys = this.providerKeys.get(identifier);
        this.providerKeys.delete(identifier);

        if (keys && keys.size > 0) {
            this.recomputeKeys(keys);
        }
    }

    public async reloadProvider(identifier: string): Promise<void> {
        const provider = this.providers.find((found) => found.identifier === identifier);
        if (!provider) {
            return;
        }

        // Capture old keys before reload so we can detect removals.
        const oldKeys: Set<string> = this.providerKeys.get(identifier) ?? new Set<string>();

        await provider.load();

        // Rebuild this provider's key set from its new data.
        const newKeys: Set<string> = new Set<string>();
        for (const [key] of provider.getAll()) {
            newKeys.add(key);
        }
        this.providerKeys.set(identifier, newKeys);

        // Recompute the union of old and new keys to handle both additions and removals.
        const affectedKeys: Set<string> = new Set<string>(oldKeys);
        for (const key of newKeys) {
            affectedKeys.add(key);
        }

        this.recomputeKeys(affectedKeys);
    }

    /** Rebuilds provider key tracking for all providers. */
    private rebuildAllProviderKeys(): void {
        this.providerKeys.clear();
        for (const provider of this.providers) {
            const keys: Set<string> = new Set<string>();
            for (const [key] of provider.getAll()) {
                keys.add(key);
            }
            this.providerKeys.set(provider.identifier, keys);
        }
    }

    /**
     * Recomputes only the specified keys across all providers.
     * For each key, iterates providers in priority order (low to high);
     * the last provider with a value wins.
     */
    private recomputeKeys(keys: Set<string>): void {
        const ordered: IDataProvider<T>[] = [...this.providers].sort((a, b) => a.priority - b.priority);

        // Build a per-provider lookup only for impacted keys.
        const providerEntries = new Map<string, Map<string, T>>();
        for (const provider of ordered) {
            const map = new Map<string, T>();
            for (const [key, entry] of provider.getAll()) {
                if (keys.has(key)) {
                    map.set(key, entry);
                }
            }
            providerEntries.set(provider.identifier, map);
        }

        for (const key of keys) {
            this.merged.delete(key);
            this.provenance.delete(key);

            let matchCount = 0;
            let winnerValue: T | undefined;
            let winnerProviderIdentifier: string | undefined;
            let winnerSourcePath: string | undefined;

            for (const provider of ordered) {
                const entry = providerEntries.get(provider.identifier)?.get(key);
                if (entry) {
                    matchCount++;
                    if (winnerValue !== undefined) {
                        winnerValue = this.mergeStrategy.merge(winnerValue, entry);
                    } else {
                        winnerValue = entry;
                    }
                    winnerProviderIdentifier = provider.identifier;
                    winnerSourcePath = entry.sourcePath;
                }
            }

            if (matchCount > 0 && winnerValue !== undefined && winnerProviderIdentifier && winnerSourcePath) {
                this.merged.set(key, winnerValue);
                this.provenance.set(key, {
                    providerId: winnerProviderIdentifier,
                    sourcePath: winnerSourcePath,
                    isOverride: matchCount > 1
                });
            }
        }
    }

    public async reloadAll(): Promise<void> {
        for (const provider of this.providers) {
            await provider.load();
        }
        this.rebuildAllProviderKeys();
        this.rebuild();
    }

    /**
     * Full rebuild of the merged cache from all providers.
     * Used on initial load and reloadAll.
     */
    private rebuild(): void {
        this.merged.clear();
        this.provenance.clear();

        const ordered: IDataProvider<T>[] = [...this.providers].sort((a, b) => a.priority - b.priority);
        for (const provider of ordered) {
            for (const [key, entry] of provider.getAll()) {
                const isOverride: boolean = this.merged.has(key);

                const existing: T | undefined = this.merged.get(key);
                if (existing !== undefined) {
                    this.merged.set(key, this.mergeStrategy.merge(existing, entry));
                } else {
                    this.merged.set(key, entry);
                }

                this.provenance.set(key, {
                    providerId: provider.identifier,
                    sourcePath: entry.sourcePath,
                    isOverride
                });
            }
        }
    }

    private sort(): void {
        this.providers.sort((a, b) => a.priority - b.priority);
    }

    public has(key: string): boolean {
        return this.merged.has(key);
    }

    public get(key: string): IResolution<T> | undefined {
        const value: T | undefined = this.merged.get(key);
        if (value === undefined) {
            return undefined;
        }
        const meta: IProvenance = this.provenance.get(key)!;
        return {
            key,
            item: value,
            providerId: meta.providerId,
            sourcePath: meta.sourcePath,
            isOverride: meta.isOverride
        };
    }

    public getLayers(key: string): IResolution<T>[] {
        const result: IResolution<T>[] = [];
        const ordered: IDataProvider<T>[] = [...this.providers].sort((a, b) => a.priority - b.priority);

        for (const provider of ordered) {
            const value: T | undefined = provider.get(key);
            if (value !== undefined) {
                result.push({
                    key,
                    item: value,
                    providerId: provider.identifier,
                    sourcePath: value.sourcePath,
                    isOverride: false
                });
            }
        }

        for (let index = 1; index < result.length; index++) {
            result[index].isOverride = true;
        }

        return result;
    }
}
