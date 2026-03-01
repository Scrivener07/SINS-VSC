import { DataSource, FileEntry } from "./data-source";

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
 */
export class LayeredRoot {
    /** Sources ordered by priority (low to high). */
    private sources: DataSource[] = [];

    public addSource(source: DataSource): void {
        this.sources.push(source);
        this.sources.sort((a, b) => a.priority - b.priority);
    }

    public removeSource(directory: string): void {
        this.sources = this.sources.filter((source) => source.directory !== directory);
    }

    public async scanAll(): Promise<void> {
        for (const source of this.sources) {
            await source.scan();
        }
    }

    /**
     * Resolves a file reference. Returns the winning entry (highest priority source).
     *
     * Example: resolveFile(".research_subject", "advent_commerce_0")
     */
    public resolveFile(extension: string, fileKey: string): ResolvedFile | undefined {
        let winner: ResolvedFile | undefined;
        let seenCount: number = 0;

        // Iterate low→high priority; last match wins.
        for (const source of this.sources) {
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

        for (const source of this.sources) {
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
        for (const source of this.sources) {
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

        for (const source of this.sources) {
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

    /** Exposes sources for iteration (localization content merging). */
    public getSources(): readonly DataSource[] {
        return this.sources;
    }
}
