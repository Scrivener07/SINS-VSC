import { DataSource, FileEntry } from "./data-source";
import { LayeredRoot, ResolvedFile } from "./data-root";

/**
 * A scoped projection of a `LayeredRoot`, filtered to only the sources
 * in a specific dependency closure.
 *
 * This is what feature providers (completions, validation, hover) should
 * query against, not the global root directly.
 *
 * `ScopedViews` are cheap to create and hold no data of their own.
 * They delegate to the underlying `LayeredRoot` but filter by source directory.
 */
export class ScopedView {
    private readonly root: LayeredRoot;

    /** The directories in scope, in priority order (low → high). */
    private readonly scope: ReadonlySet<string>;

    /** Ordered source directories for iteration. */
    private readonly orderedScope: readonly string[];

    constructor(root: LayeredRoot, closureDirectories: string[]) {
        this.root = root;
        this.orderedScope = closureDirectories;
        this.scope = new Set(closureDirectories);
    }

    /** The directory this view is "from" (the last/highest-priority entry). */
    public get contextDirectory(): string {
        return this.orderedScope[this.orderedScope.length - 1];
    }

    /**
     * Resolves a file reference within this scope only.
     */
    public resolveFile(extension: string, fileKey: string): ResolvedFile | undefined {
        // Get all layers from the global root, then filter to our scope.
        const layers: ResolvedFile[] = this.root.getFileLayers(extension, fileKey);
        let winner: ResolvedFile | undefined;

        for (const layer of layers) {
            if (this.scope.has(layer.source.directory)) {
                winner = layer;
            }
        }

        return winner;
    }

    /**
     * Gets all file keys of a given extension, but only from sources in scope.
     */
    public getAllKeys(extension: string): Set<string> {
        const keys: Set<string> = new Set<string>();
        for (const source of this.getScopedSources()) {
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
     * Checks if a file exists within scope.
     */
    public hasFile(extension: string, identifier: string): boolean {
        return this.resolveFile(extension, identifier) !== undefined;
    }

    /**
     * Resolves an identifier when the extension is unknown, scoped.
     */
    public resolveIdentifier(fileKey: string): ResolvedFile[] {
        return this.root.resolveIdentifier(fileKey).filter((resolved) => this.scope.has(resolved.source.directory));
    }

    /**
     * Returns the sources in scope, ordered by priority.
     */
    public getScopedSources(): readonly DataSource[] {
        return this.root.getSources().filter((source) => this.scope.has(source.directory));
    }
}
