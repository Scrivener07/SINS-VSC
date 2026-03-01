import { IDataSource } from "../data/types";
import { LocalizationResolver } from "./resolvers/localization-resolver";
import { UniformResolver } from "./resolvers/uniform-resolver";
import { DataSource } from "./data-source";
import { ManifestResolver } from "./resolvers/manifest-resolver";
import { DataContext } from "./data-context";
import { ScopedView } from "./scoped-view";

/**
 * Top-level game data service.
 */
export class GameData {
    public readonly context: DataContext;
    public readonly localization: LocalizationResolver;
    public readonly uniforms: UniformResolver;
    public readonly manifests: ManifestResolver;

    constructor() {
        this.context = new DataContext();
        // Resolvers work against the global root for building caches.
        // Scoped filtering happens at query time via ScopedView.
        this.localization = new LocalizationResolver(this.context.root);
        this.uniforms = new UniformResolver(this.context.root);
        this.manifests = new ManifestResolver(this.context.root);
    }

    public async addSource(config: IDataSource): Promise<void> {
        const source: DataSource = new DataSource(config.directory, config.name, config.priority);
        this.context.addSource(config);
    }

    public async reload(): Promise<void> {
        await this.context.scanAll();
        await this.localization.rebuild();
        await this.uniforms.rebuild();
        await this.manifests.rebuild();
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
