import { DataSource, FileEntry } from "./data-source";
import { KeyedCollection } from "@soase/shared";

/**
 * Represents a resolved file with provenance.
 */
export interface ResolvedFile {
    readonly entry: FileEntry;
    readonly source: DataSource;
    readonly isOverride: boolean;
}

/**
 * Manages an ordered list of data sources and resolves file lookups using a last-wins priority scheme.
 * Sources ordered by `priority` (low to high).
 *
 * TODO: verify...
 * - If a source is removed, do we need to re-sort the remaining sources?
 * - Does the `super().remove()` need to be overriden to stop the source watcher?
 */
export class LayeredRoot extends KeyedCollection<string, DataSource> {
    //#region KeyedCollection

    protected getKeyForItem(item: DataSource): string {
        return item.directory.toLowerCase();
    }

    /**
     * Adds a source and maintains priority ordering.
     */
    public override add(source: DataSource): void {
        super.add(source);
        this.sort();
    }

    /**
     * Removes a source by directory, disposing its watcher.
     */
    public removeByDirectory(directory: string): void {
        const key: string = directory.toLowerCase();
        const source: DataSource | undefined = this.get(key);
        if (source) {
            source.unload();
            this.collection.delete(key);
        }

        // TODO: Verify if a removal doesnt need to re-sort the collection.
    }

    public override clear(): void {
        for (const source of this) {
            source.unload();
        }
        super.clear();
    }

    //#endregion

    //#region Sorting

    private sort(): void {
        // TODO: Audit the performance impact of rebuilding the entire map on every change.
        // KeyedCollection uses a Map which maintains insertion order.
        // Re-insert all entries in priority order?
        const sorted: DataSource[] = this.toArray().sort((a, b) => a.priority - b.priority);
        this.collection.clear();
        for (const source of sorted) {
            const key: string = this.getKeyForItem(source);
            this.collection.set(key, source);
        }
    }

    // /**
    //  * Returns sources in priority order (low to high).
    //  */
    // private ordered(): DataSource[] {
    //     return this.toArray().sort((a, b) => a.priority - b.priority);
    // }

    //#endregion

    //#region Lifecycle

    public async scanAll(): Promise<void> {
        for (const source of this) {
            await source.scan();
        }
    }

    public watchAll(): void {
        for (const source of this) {
            source.watch();
        }
    }

    //#endregion

    //#region Resolution

    /**
     * Resolves a file reference. Returns the winning entry (highest priority source).
     *
     * Example: resolveFile(".research_subject", "advent_commerce_0")
     */
    public resolveFile(extension: string, fileKey: string): ResolvedFile | undefined {
        let winner: ResolvedFile | undefined;
        let seenCount: number = 0;

        // Iterate low→high priority; last match wins.
        for (const source of this) {
            const entry: FileEntry | undefined = source.getFile(extension, fileKey);
            if (entry) {
                seenCount++;
                winner = {
                    entry,
                    source,
                    isOverride: seenCount > 1
                };
            }
        }

        return winner;
    }

    /**
     * Returns all layers for a file reference, ordered low→high priority.
     * Useful for "go to definition" showing all sources.
     */
    public getFileLayers(extension: string, fileKey: string): ResolvedFile[] {
        const layers: ResolvedFile[] = [];

        for (const source of this) {
            const entry: FileEntry | undefined = source.getFile(extension, fileKey);
            if (entry) {
                const resolved: ResolvedFile = {
                    entry: entry,
                    source: source,
                    isOverride: layers.length > 0
                };
                layers.push(resolved);
            }
        }

        return layers;
    }

    /**
     * Gets all file keys of a given extension across all sources (union).
     * Useful for completions: "list all .weapon identifiers".
     */
    public getAllKeys(extension: string): Set<string> {
        const keys = new Set<string>();
        for (const source of this) {
            const bucket: Map<string, FileEntry> | undefined = source.getFilesByExtension(extension);
            if (bucket) {
                for (const key of bucket.keys()) {
                    keys.add(key);
                }
            }
        }
        return keys;
    }

    /**
     * Resolves a file reference when the extension is unknown.
     * Searches all sources for any file matching the key.
     * Returns all matches (there may be multiple extensions).
     */
    public resolveIdentifier(fileKey: string): ResolvedFile[] {
        const results: Map<string, ResolvedFile> = new Map<string, ResolvedFile>();

        for (const source of this) {
            for (const extension of source.getExtensions()) {
                const entry: FileEntry | undefined = source.getFile(extension, fileKey);
                if (entry) {
                    const mapKey: string = `${extension}::${fileKey}`;
                    const existing: boolean = results.has(mapKey);
                    const resolved: ResolvedFile = {
                        entry: entry,
                        source: source,
                        isOverride: existing
                    };
                    results.set(mapKey, resolved);
                }
            }
        }

        return Array.from(results.values());
    }

    //#endregion
}
