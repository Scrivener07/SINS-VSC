import { IDataSource } from "../../../../packages/server/out/data/types";
import { ResolvedFile } from "../../../../packages/server/out/data/data-root";
import { GameData } from "../../../../packages/server/out/data/data-service";
import { DataSource, FileEntry } from "../../../../packages/server/out/data/data-source";
import { DependencyGraph } from "../../../../packages/server/out/data/dependency-graph";
import { ScopedView } from "../../../../packages/server/out/data/scoped-view";

suite("[Diagnostic] Data Harness", function () {
    let harness: DataHarness;

    suiteSetup(async function () {
        this.timeout(30_000);
        harness = new DataHarness();
        await harness.startup();
    });

    test("catalog stats", function () {
        harness.test_catalog_stats();
    });

    test("dependency closures", function () {
        harness.test_dependency_closure();
    });

    test("file resolution", function () {
        harness.test_file_resolution();
    });

    test("resolve source for file", function () {
        harness.test_resolve_source_for_file();
    });

    test("resolve identifier", function () {
        harness.test_resolve_identifier();
    });
});

type CatalogStat = { fileExtension: string; fileCount: number };

class DataHarness {
    private readonly gameData: GameData;

    private readonly gameSource: IDataSource = {
        directory: "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Sins2",
        name: "Game",
        priority: 0
    };

    private readonly memSource: IDataSource = {
        directory: "C:\\Users\\Public\\mod.io\\5762\\mods\\4527333",
        name: "M.E.M Framework",
        priority: 1
        /** Dependencies
         * - [0] Game
         */
    };

    private readonly sgrSource: IDataSource = {
        directory: "C:\\Users\\Public\\mod.io\\5762\\mods\\4286987",
        name: "SGR - Stargate Races",
        priority: 2
        /** Dependencies
         * - [0] Game
         * - [1] M.E.M Framework
         */
    };

    private readonly haloSource: IDataSource = {
        directory: "S:\\Studio\\Stardock\\Ironclad\\SINS-2\\Halo",
        name: "Halo",
        priority: 3
        /** Dependencies
         * - [0] Game
         */
    };

    constructor() {
        this.gameData = new GameData();
    }

    public async startup() {
        // Register all sources.
        await this.gameData.addSource(this.gameSource);
        await this.gameData.addSource(this.memSource);
        await this.gameData.addSource(this.sgrSource);
        await this.gameData.addSource(this.haloSource);

        // Declare dependency edges.
        const graph: DependencyGraph = this.gameData.context.graph;

        // MEM depends on base game.
        graph.addEdge(this.memSource.directory, this.gameSource.directory);

        // SGR depends on MEM and base game.
        graph.addEdge(this.sgrSource.directory, this.gameSource.directory);
        graph.addEdge(this.sgrSource.directory, this.memSource.directory);

        // Halo depends on base game only.
        graph.addEdge(this.haloSource.directory, this.gameSource.directory);

        await this.gameData.reload();
    }

    public test_data_views() {
        // Query from Game's perspective → sees [Game] only.
        const gameView: ScopedView = this.gameData.context.getView(this.gameSource.directory);
        console.log("Game weapons:", gameView.getAllKeys(".weapon"));

        // Query from SGR's perspective → sees [Game, MEM, SGR] only.
        const sgrView: ScopedView = this.gameData.context.getView(this.sgrSource.directory);
        console.log("SGR weapons:", sgrView.getAllKeys(".weapon"));

        // Query from Halo's perspective → sees [Game, Halo] only.
        const haloView: ScopedView = this.gameData.context.getView(this.haloSource.directory);
        console.log("Halo weapons:", haloView.getAllKeys(".weapon"));
    }

    /**
     * Log catalog statistics per source such as how many extensions and how many files total.
     */
    public test_catalog_stats() {
        console.log("\n=== Catalog Stats ===");
        for (const source of this.gameData.context.root.getSources()) {
            const extensions: string[] = [...source.getExtensions()];
            let totalFiles: number = 0;

            for (const extension of extensions) {
                const bucket: Map<string, FileEntry> | undefined = source.getFilesByExtension(extension);
                totalFiles += bucket?.size ?? 0;
            }
            console.log(`[${source.name}] priority=${source.priority}, extensions=${extensions.length}, files=${totalFiles}`);

            // Show extensions by file count.
            const ranked: CatalogStat[] = extensions
                .map((extension) => ({ fileExtension: extension, fileCount: source.getFilesByExtension(extension)?.size ?? 0 }))
                .sort((a, b) => b.fileCount - a.fileCount); // sort by file count, descending.

            for (const { fileExtension, fileCount } of ranked) {
                console.log(`  ${fileExtension}: ${fileCount} files`);
            }
        }
    }

    /**
     * Show the dependency closure for each source.
     */
    public test_dependency_closure() {
        console.log("\n=== Dependency Closures ===");
        const sources: IDataSource[] = [this.gameSource, this.memSource, this.sgrSource, this.haloSource];
        for (const source of sources) {
            const closure: string[] = this.gameData.context.graph.getClosure(source.directory);
            console.log(`[${source.name}] sees ${closure.length} source(s):`);
            for (const directory of closure) {
                // Find the name for the directory.
                const match: IDataSource | undefined = sources.find((dataSource: IDataSource) => dataSource.directory === directory);
                console.log(`  - ${match?.name ?? directory}`);
            }
        }
    }

    /**
     * Check if a mod overrides a base game file.
     */
    public test_file_resolution() {
        console.log("\n=== File Resolution (Override Detection) ===");
        const extensions: string[] = [".unit", ".weapon", ".entity_manifest", ".player"];
        for (const extension of extensions) {
            const allKeys: Set<string> = this.gameData.context.root.getAllKeys(extension);
            let overrideCount: number = 0;
            for (const key of allKeys) {
                const resolved: ResolvedFile | undefined = this.gameData.context.root.resolveFile(extension, key);
                if (resolved?.isOverride) {
                    overrideCount++;
                    // Log first few overrides as examples.
                    if (overrideCount <= 3) {
                        const layers: ResolvedFile[] = this.gameData.context.root.getFileLayers(extension, key);
                        console.log(`  ${key}${extension} overridden by [${resolved.source.name}] (${layers.length} layers)`);
                    }
                }
            }
            if (overrideCount > 0) {
                console.log(`  ${extension}: ${overrideCount} total overrides out of ${allKeys.size} keys`);
            }
        }
    }

    /**
     * Determine which source owns a specific file path.
     */
    public test_resolve_source_for_file() {
        console.log("\n=== Resolve Source For File ===");
        const testPaths: string[] = [
            "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Sins2\\entities\\trader_light_frigate.unit",
            "C:\\Users\\Public\\mod.io\\5762\\mods\\4286987\\entities\\stargate_mothership.unit",
            "S:\\Studio\\Stardock\\Ironclad\\SINS-2\\Halo\\entities\\unsc_frigate.unit",
            "D:\\SomeUnknownPath\\random_file.weapon" // Should fall back to undefined.
        ];
        for (const filePath of testPaths) {
            const sourceDir: string | undefined = this.gameData.context.resolveSourceForFile(filePath);
            const source: DataSource | undefined = this.gameData.context.root.getSources().find((s) => s.directory === sourceDir);
            console.log(`  ${filePath}`);
            console.log(`    → ${source?.name ?? "UNRESOLVED (global fallback)"}`);
        }
    }

    /**
     * Find a file when extension is unknown.
     */
    public test_resolve_identifier() {
        console.log("\n=== Resolve Identifier (Extension Unknown) ===");
        const testKeys: string[] = ["trader_light_frigate", "advent_commerce_0", "nonexistent_garbage_key"];
        for (const key of testKeys) {
            const results: ResolvedFile[] = this.gameData.context.root.resolveIdentifier(key);
            if (results.length === 0) {
                console.log(`  "${key}" → NOT FOUND`);
            } else {
                console.log(`  "${key}" → ${results.length} match(es):`);
                for (const result of results) {
                    console.log(`    ${result.entry.extension} from [${result.source.name}] ${result.isOverride ? "(override)" : ""}`);
                }
            }
        }
    }
}
