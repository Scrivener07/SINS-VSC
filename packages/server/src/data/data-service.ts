import { IDataSource } from "./types";
import { LocalizationResolver } from "./resolvers/localization-resolver";
import { UniformResolver } from "./resolvers/uniform-resolver";
import { ManifestResolver } from "./resolvers/manifest-resolver";
import { DataContext } from "./data-context";
import { ScopedView } from "./scoped-view";

/**
 * The top-level game data service.
 *
 * - Resolvers work against the global root for building caches.
 * - Scoped filtering happens at query time via `ScopedView`.
 */
export class DataService {
    public readonly context: DataContext;
    public readonly localization: LocalizationResolver;
    public readonly uniforms: UniformResolver;
    public readonly manifests: ManifestResolver;

    constructor() {
        this.context = new DataContext();
        this.localization = new LocalizationResolver(this.context.root);
        this.uniforms = new UniformResolver(this.context.root);
        this.manifests = new ManifestResolver(this.context.root);
    }

    public async addSource(configuration: IDataSource): Promise<void> {
        await this.context.addSource(configuration);
    }

    public removeSource(directory: string): void {
        this.context.removeSource(directory);
    }

    public async reload(): Promise<void> {
        // WIP
        await this.context.rebuildDependencies();

        // Scan all source files.
        await this.context.scanAll();

        // Rebuild resolver caches after loading all data.
        await this.localization.rebuild();
        await this.uniforms.rebuild();
        await this.manifests.rebuild();

        // Watch...
        // NOTE: Comment this line to disable file watching for debugging purposes.
        this.context.watchAll();
    }

    /**
     * Gets the appropriate scoped view for a file.
     * This is what feature handlers call.
     */
    public getViewForFile(filePath: string): ScopedView {
        return this.context.getViewForFile(filePath);
    }

    //#region Convenience methods

    /** For completions: get all identifiers of a type. */
    public getIdentifiers(extension: string): Set<string> {
        return this.context.root.getAllKeys(extension);
    }

    /** Checks if an identifier exists for a given file extension. */
    public hasIdentifier(extension: string, identifier: string): boolean {
        return this.context.root.getAllKeys(extension)?.has(identifier) ?? false;
    }

    /** For validation: does this identifier exist as a file? */
    public hasFile(extension: string, identifier: string): boolean {
        return this.context.root.resolveFile(extension, identifier) !== undefined;
    }

    /** For go-to-definition: resolve an identifier to a file path. */
    public resolveFilePath(extension: string, identifier: string): string | undefined {
        return this.context.root.resolveFile(extension, identifier)?.entry.filePath;
    }

    //#endregion
}
