import { LayeredRoot } from "./data-root";
import { DataSource } from "./data-source";
import { IDataSource } from "../data/types";
import { DependencyGraph } from "./dependency-graph";
import { ScopedView } from "./scoped-view";

/**
 * Manages data source registration, the dependency graph, and scoped view creation.
 *
 * This is the single entry point for the data layer.
 * Feature providers ask it for a `ScopedView` based on the file they're currently operating on.
 */
export class DataContext {
    public readonly root: LayeredRoot;
    public readonly graph: DependencyGraph;

    /** directory → DataSource, for quick lookup. */
    private readonly sourceMap = new Map<string, DataSource>();

    constructor() {
        this.root = new LayeredRoot();
        this.graph = new DependencyGraph();
    }

    /**
     * Registers a data source.
     *
     * - Dependency edges are managed separately.
     * - This does not trigger a scan. Call `reload()` after registering all sources and their dependencies.
     */
    public async addSource(configuration: IDataSource): Promise<void> {
        const source: DataSource = new DataSource(configuration.directory, configuration.name, configuration.priority);
        this.sourceMap.set(configuration.directory, source);
        this.root.addSource(source);
    }

    /**
     * Removes a data source and its dependency edges.
     */
    public removeSource(directory: string): void {
        this.sourceMap.delete(directory);
        this.root.removeSource(directory);
        this.graph.removeNode(directory);
    }

    /**
     * Scans all sources to populate file catalogs.
     */
    public async scanAll(): Promise<void> {
        await this.root.scanAll();
    }

    //#region Views

    /**
     * Creates a scoped view for a given source directory.
     * The view includes only the transitive dependency closure.
     *
     * Example: For SGR that has view with → [BaseGame, MEM, SGR]
     * ```
     * getView("C:\\mods\\SGR")
     * ```
     */
    public getView(sourceDirectory: string): ScopedView {
        const closure: string[] = this.graph.getClosure(sourceDirectory);
        return new ScopedView(this.root, closure);
    }

    /**
     * Creates a "global" view that includes ALL sources.
     *
     * This might be used as a fallback when:
     * - The file doesn't belong to any known source.
     * - For operations that inherently need everything (like full workspace search).
     */
    public getGlobalView(): ScopedView {
        const allDirectories: string[] = this.root.getSources().map((source) => source.directory);
        return new ScopedView(this.root, allDirectories);
    }

    /**
     * Gets the appropriate scoped view for a file path.
     * This is the primary API that feature providers should use.
     *
     * 1. Determines which source owns the file.
     * 2. Returns a view scoped to that source's dependency closure.
     * 3. Falls back to the global view if the file is unrecognized.
     */
    public getViewForFile(filePath: string): ScopedView {
        const sourceDirectory: string | undefined = this.resolveSourceForFile(filePath);
        if (sourceDirectory) {
            return this.getView(sourceDirectory);
        }
        return this.getGlobalView();
    }

    /**
     * Determines which source a file belongs to, based on its path.
     * Returns the most specific (longest prefix) match for overlapping sources.
     *
     * Example:
     *
     * Consider two data sources with these directories:
     * - Source A: `C:\MyProjects`          (length 13)
     * - Source B: `C:\MyProjects\Halo`     (length 18)
     *
     * Then we have to determine which source this file belongs to:
     * - File: `C:\MyProjects\Halo\entities\my_ship.unit_skin`
     *
     * The length check says: the longest matching prefix is the most specific match, so Source B wins.
     */
    public resolveSourceForFile(filePath: string): string | undefined {
        const normalizedFile: string = filePath.toLowerCase();
        let match: string | undefined;
        let matchLength: number = 0;

        for (const directory of this.sourceMap.keys()) {
            const normalizedDirectory: string = directory.toLowerCase();
            if (normalizedFile.startsWith(normalizedDirectory) && normalizedDirectory.length > matchLength) {
                match = directory; // Return with original casing.
                matchLength = normalizedDirectory.length;
            }
        }

        return match;
    }

    //#endregion
}
