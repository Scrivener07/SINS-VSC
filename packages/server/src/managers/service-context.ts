import { DataManager, IndexManager, LocalizationManager, ManifestManager, TextureManager, UniformManager } from ".";
import { Connection } from "vscode-languageserver/node";

/**
 * @deprecated
 */
export class ContextService {
    public gameLayer: ContextLayer;
    public modLayer: ContextLayer;

    constructor() {
        this.gameLayer = new ContextLayer();
        this.modLayer = new ContextLayer();
    }

    public async initialize_game(connection: Connection, folder: string | null, currentLanguageCode: string): Promise<void> {
        if (folder) {
            await Promise.all([
                this.gameLayer.rebuild(folder, currentLanguageCode),
                this.gameLayer.localizationManager //
                    .loadFromWorkspace(folder)
                    .then(() => connection.console.info("Game localization data loaded.")),
                this.gameLayer.textureManager //
                    .loadFromWorkspace(folder)
                    .then(() => connection.console.info("Game texture data loaded."))
            ]);
        }
    }

    public async initialize_mod(connection: Connection, folder: string | null, currentLanguageCode: string): Promise<void> {
        if (folder) {
            await Promise.all([
                this.modLayer.rebuild(folder, currentLanguageCode),
                this.modLayer.localizationManager //
                    .loadFromWorkspace(folder)
                    .then(() => connection.console.info("Modification localization data loaded.")),
                this.modLayer.textureManager //
                    .loadFromWorkspace(folder)
                    .then(() => connection.console.info("Modification texture data loaded."))
            ]);
        }
    }
}

/**
 * @deprecated
 */
export class ContextLayer {
    public indexManager: IndexManager;
    public localizationManager: LocalizationManager;
    public textureManager: TextureManager;

    public dataManager: DataManager;
    public manifestManager: ManifestManager;
    public uniformManager: UniformManager;

    constructor() {
        this.indexManager = new IndexManager();
        this.localizationManager = new LocalizationManager();
        this.textureManager = new TextureManager();
        this.dataManager = new DataManager();
        this.manifestManager = new ManifestManager();
        this.uniformManager = new UniformManager();
    }

    public async rebuild(rootPath: string, language: string): Promise<void> {
        this.manifestManager.clear();
        this.uniformManager.clear();
        this.dataManager.clear();
        this.indexManager.clear();

        await this.indexManager.rebuild(rootPath);

        console.time(`Caching::'${rootPath}'`);
        await this.dataManager.load(rootPath, language);
        await this.manifestManager.load(rootPath);
        await this.uniformManager.load(rootPath);
        console.timeEnd(`Caching::'${rootPath}'`);
        console.log(`Cached ${this.dataManager.size()} elements in '${rootPath}'.`);
    }
}
