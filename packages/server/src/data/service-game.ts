import path = require("path");
import { WorkspaceSearch } from "../managers";
import { OrderedRoot } from "./root-ordered";
import {
    ConcatMerge,
    ConcatMergeValueStringArray,
    ReplaceMerge,
    UnionMerge,
    UnionMergeValueSetString,
    ValueStringSet,
    ValueString,
    ValueStringArray
} from "./types";
import { TextureProvider } from "./provider-texture";
import { IndexProvider } from "./provider-index";
import { LocalizationProvider } from "./provider-localization";
import { DataProvider } from "./provider-data";
import { ManifestProvider } from "./provider-manifest";
import { UniformProvider } from "./provider-uniform";
import { ILanguageState } from "../types";

export class GameDataService {
    public readonly indexer: IndexerService;
    public readonly localization: LocalizationService;
    public readonly textures: TextureService;

    public readonly data: DataService;
    public readonly manifests: ManifestService;
    public readonly uniforms: UniformService;

    private readonly language: ILanguageState;

    constructor(language: ILanguageState) {
        this.language = language;
        this.indexer = new IndexerService();
        this.localization = new LocalizationService();
        this.textures = new TextureService();
        this.data = new DataService();
        this.manifests = new ManifestService();
        this.uniforms = new UniformService();
    }

    public async create_game(folder: string) {
        // Base game providers (priority 0 = lowest)
        this.create(folder, "Base Game", 0);
    }

    public async create_mod(folder: string) {
        // Mod providers (priority 10 is higher, wins over base)
        this.create(folder, "Mod", 10);
    }

    private async create(rootPath: string, name: string, priority: number): Promise<void> {
        this.indexer.create(rootPath, name, priority);
        await this.localization.create(rootPath, name, priority);
        this.textures.create(rootPath, name, priority);
        this.data.create(rootPath, name, priority, this.language.code);
        this.manifests.create(rootPath, name, priority);
        this.uniforms.create(rootPath, name, priority);
    }

    public async reload(): Promise<void> {
        // Load all roots to populate caches.
        await this.indexer.reload();
        await this.localization.reload();
        await this.textures.reload();
        await this.data.reload();
        await this.manifests.reload();
        await this.uniforms.reload();
    }

    /**
     * Removes all providers associated with a specific folder.
     * Called when a workspace folder is removed.
     */
    public removeFolder(rootPath: string): void {
        // Each provider's identifier is the rootPath, so they can be matched directly.
        this.indexer.index.removeProvider(rootPath);
        this.textures.root.removeProvider(rootPath);
        this.data.root.removeProvider(rootPath);
        this.manifests.root.removeProvider(rootPath);
        this.uniforms.root.removeProvider(rootPath);

        // Localization providers have identifiers like "rootPath::language".
        for (const [language, root] of this.localization.languages) {
            const identifier = `${rootPath}::${language}`;
            root.removeProvider(identifier);
        }
    }
}

export class IndexerService {
    /** File index: concatenation merge (mod files add to base files). */
    public readonly index: OrderedRoot<ValueStringArray>;

    constructor() {
        this.index = new OrderedRoot<ValueStringArray>(new ConcatMergeValueStringArray());
    }

    public create(rootPath: string, name: string, priority: number): void {
        const index = new IndexProvider(rootPath, name, priority, rootPath);
        this.index.addProvider(index);
    }

    public async reload(): Promise<void> {
        await this.index.reloadAll();
    }
}

export class LocalizationService {
    private static readonly FILE_EXTENSION = ".localized_text";

    /** Localization: last-wins per composite key (mod translations override base). */
    public readonly languages: Map<string, OrderedRoot<ValueString>>;

    constructor() {
        this.languages = new Map<string, OrderedRoot<ValueString>>();
    }

    public async create(rootPath: string, name: string, priority: number): Promise<void> {
        const files: string[] = await WorkspaceSearch.findFiles(rootPath, LocalizationService.FILE_EXTENSION);
        for (const file of files) {
            const language: string = path.basename(file, LocalizationService.FILE_EXTENSION);

            let root: OrderedRoot<ValueString> | undefined = this.languages.get(language);
            if (!root) {
                // Add a new root for this language if it doesn't exist yet.
                root = new OrderedRoot<ValueString>(new ReplaceMerge<ValueString>());
                this.languages.set(language, root);
            }

            const providerIdentifier: string = `${rootPath}::${language}`;
            const providerName: string = `${name} (${language})`;
            const provider = new LocalizationProvider(providerIdentifier, providerName, priority, rootPath, language);
            root.addProvider(provider);
        }
    }

    public async reload(): Promise<void> {
        for (const root of this.languages.values()) {
            await root.reloadAll();
        }
    }

    public get(language: string): OrderedRoot<ValueString> | undefined {
        return this.languages.get(language);
    }
}

export class TextureService {
    /** Textures: last-wins replacement (mod texture overrides base texture). */
    public readonly root: OrderedRoot<ValueString>;

    constructor() {
        this.root = new OrderedRoot<ValueString>(new ReplaceMerge<ValueString>());
    }

    public create(rootPath: string, name: string, priority: number): void {
        const textures = new TextureProvider(rootPath, name, priority, rootPath);
        this.root.addProvider(textures);
    }

    public async reload(): Promise<void> {
        await this.root.reloadAll();
    }
}

export class DataService {
    public readonly root: OrderedRoot<ValueStringSet>;

    constructor() {
        this.root = new OrderedRoot<ValueStringSet>(new UnionMergeValueSetString());
    }

    public create(rootPath: string, name: string, priority: number, language: string): void {
        const provider = new DataProvider(rootPath, name, priority, rootPath, language);
        this.root.addProvider(provider);
    }

    public async reload(): Promise<void> {
        await this.root.reloadAll();
    }
}

export class ManifestService {
    public readonly root: OrderedRoot<ValueStringSet>;

    constructor() {
        this.root = new OrderedRoot<ValueStringSet>(new UnionMergeValueSetString());
    }

    public create(rootPath: string, name: string, priority: number): void {
        const provider = new ManifestProvider(rootPath, name, priority, rootPath);
        this.root.addProvider(provider);
    }

    public async reload(): Promise<void> {
        await this.root.reloadAll();
    }
}

export class UniformService {
    public readonly root: OrderedRoot<ValueStringSet>;

    constructor() {
        this.root = new OrderedRoot<ValueStringSet>(new UnionMergeValueSetString());
    }

    public create(rootPath: string, name: string, priority: number): void {
        const provider = new UniformProvider(rootPath, name, priority, rootPath);
        this.root.addProvider(provider);
    }

    public async reload(): Promise<void> {
        await this.root.reloadAll();
    }
}
