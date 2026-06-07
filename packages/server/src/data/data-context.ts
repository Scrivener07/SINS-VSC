import { FileChangeEvent } from "../files";
import { IDataSource } from "./types";
import { LayeredRoot } from "./data-root";
import { DataSource } from "./data-source";
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
        const source: DataSource = new DataSource(
            configuration.directory,
            configuration.name,
            configuration.priority,
            configuration.dependencies,
            configuration.kind
        );
        source.setChangeListener(this.onSourceChanged.bind(this));
        this.sourceMap.set(configuration.directory, source);
        this.root.add(source);

        // WIP
        await this.rebuildDependencies();
    }

    /**
     * Removes a data source and its dependency edges.
     */
    public removeSource(directory: string): void {
        this.sourceMap.delete(directory);
        this.root.removeByDirectory(directory);
        this.graph.removeNode(directory);
    }

    /**
     * Scans all sources to populate file catalogs.
     */
    public async scanAll(): Promise<void> {
        await this.root.scanAll();
    }

    public watchAll() {
        this.root.watchAll();
    }

    private async onSourceChanged(source: DataSource, events: FileChangeEvent[]): Promise<void> {
        console.log(`Source: ${source.name} has ${events.length} file changes at ${source.directory}`);
        for (const event of events) {
            console.log(`  Action: ${event.type}, File: ${event.relativePath}`);
        }

        // TODO: May need to rebuild dependencies if a new .mod_dependency file is added/removed/changed.
        // await this.rebuildDependencies();
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
        const allDirectories: string[] = this.root.map((source) => source.directory);
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

    // WIP: Audit this code with tests.
    //#region Dependency Graph Management

    public async rebuildDependencies(): Promise<void> {
        const sourceByNormalized: Map<string, string> = new Map<string, string>();
        const declarations: Array<{ dependent: string; dependencies: string[] }> = [];

        for (const source of this.sourceMap.values()) {
            sourceByNormalized.set(source.directory.toLowerCase(), source.directory);
        }

        for (const source of this.sourceMap.values()) {
            const resolvedOrdered: string[] = [];
            const seen: Set<string> = new Set<string>();

            for (const dependency of source.dependencies) {
                const match: string | undefined = sourceByNormalized.get(dependency.toLowerCase());
                if (!match) {
                    continue;
                }

                if (match === source.directory) {
                    continue;
                }

                const key: string = match.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    resolvedOrdered.push(match);
                }
            }

            declarations.push({
                dependent: source.directory,
                dependencies: resolvedOrdered
            });
        }

        this.graph.rebuild(declarations);
    }

    // public async rebuildDependencies(): Promise<void> {
    //     const sourceByNormalized = new Map<string, string>();
    //     const sourceKindByDirectory = new Map<string, "game" | "mod">();
    //     const declarations: Array<{ dependent: string; dependencies: string[] }> = [];

    //     let gameDirectory: string | undefined = undefined;

    //     for (const source of this.sourceMap.values()) {
    //         const normalized = source.directory.toLowerCase();
    //         sourceByNormalized.set(normalized, source.directory);
    //         sourceKindByDirectory.set(source.directory, source.kind);

    //         if (source.kind === "game") {
    //             gameDirectory = source.directory;
    //         }
    //     }

    //     for (const source of this.sourceMap.values()) {
    //         if (source.kind === "game") {
    //             declarations.push({ dependent: source.directory, dependencies: [] });
    //             continue;
    //         }

    //         const resolvedOrdered: string[] = [];
    //         const seen = new Set<string>();

    //         for (const dependency of source.dependencies) {
    //             const match = sourceByNormalized.get(dependency.toLowerCase());
    //             if (!match) {
    //                 continue;
    //             }

    //             if (match === source.directory) {
    //                 continue;
    //             }

    //             const key = match.toLowerCase();
    //             if (!seen.has(key)) {
    //                 seen.add(key);
    //                 resolvedOrdered.push(match);
    //             }
    //         }

    //         if (gameDirectory) {
    //             const gameKey = gameDirectory.toLowerCase();

    //             // tolerate explicit game dependency, but force game to lowest priority
    //             for (let index = resolvedOrdered.length - 1; index >= 0; index--) {
    //                 if (resolvedOrdered[index].toLowerCase() === gameKey) {
    //                     resolvedOrdered.splice(index, 1);
    //                 }
    //             }

    //             resolvedOrdered.push(gameDirectory);
    //         }

    //         declarations.push({
    //             dependent: source.directory,
    //             dependencies: resolvedOrdered
    //         });
    //     }

    //     this.graph.rebuild(declarations);
    // }

    // public async rebuildDependencies(): Promise<void> {
    //     const declarations: Array<{ dependent: string; dependencies: string[] }> = [];
    //     const sourceByNormalized = new Map<string, string>();

    //     for (const directory of this.sourceMap.keys()) {
    //         sourceByNormalized.set(directory.toLowerCase(), directory);
    //     }

    //     for (const source of this.sourceMap.values()) {
    //         const resolved: string[] = [];

    //         for (const dependency of source.dependencies) {
    //             const match: string | undefined = sourceByNormalized.get(dependency.toLowerCase());
    //             if (match) {
    //                 resolved.push(match);
    //             } else {
    //                 console.warn(`[DataContext] Dependency not found in source map: ${dependency} (required by ${source.directory})`);
    //             }
    //         }

    //         declarations.push({ dependent: source.directory, dependencies: resolved });
    //     }

    //     this.graph.rebuild(declarations);
    // }

    // public async rebuildDependencies(): Promise<void> {
    //     const declarations: Array<{ dependent: string; dependencies: string[] }> = [];
    //     const sourceByNormalized = new Map<string, string>();

    //     for (const directory of this.sourceMap.keys()) {
    //         sourceByNormalized.set(ModDependencyFile.normalizeDirectory(directory), directory);
    //     }

    //     for (const source of this.sourceMap.values()) {
    //         const dependencies: string[] | undefined = await ModDependencyFile.tryReadDependencies(source.directory);
    //         const resolved: string[] = [];

    //         for (const dependency of dependencies ?? []) {
    //             const key: string = ModDependencyFile.normalizeDirectory(dependency);
    //             const match: string | undefined = sourceByNormalized.get(key);
    //             if (match) {
    //                 resolved.push(match);
    //             }
    //         }

    //         declarations.push({ dependent: source.directory, dependencies: resolved });
    //     }

    //     this.graph.rebuild(declarations);
    // }

    //#endregion
}
