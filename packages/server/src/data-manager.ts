import * as path from "path";
import * as fs from "fs";
import { WorkspaceManager } from "./workspace";
import { CacheManager } from "./cache";
import { EntityManifestManager } from "./manifest";

/**
 * Manages an index of files within the workspace for quick lookup by identifier.
 */
export class IndexManager {
    /**
     * Maps a filename (without extension) to a list of absolute file paths.
     *
     * Example: `"trader_loyalist" -> ["c:/sins2/entities/trader_loyalist.player"]`
     */
    private fileIndex: Map<string, string[]> = new Map();

    private cacheManager: CacheManager;
    private entityManifestManager: EntityManifestManager;

    constructor(cacheManager: CacheManager, entityManifestManager: EntityManifestManager) {
        this.cacheManager = cacheManager;
        this.entityManifestManager = entityManifestManager;
    }

    /** Provides a list of file extensions for indexing. */
    private readonly fileExtensions: Set<string> = new Set([
        ".mod_meta_data",
        ".localized_text",
        ".uniforms",
        ".ability",
        ".action_data_source",
        ".buff",
        ".entity_manifest",
        ".exotic",
        ".flight_pattern",
        ".formation",
        ".npc_reward",
        ".player",
        ".player_color_group",
        ".player_icon",
        ".player_portrait",
        ".research_subject",
        ".unit_item",
        ".unit_skin",
        ".unit",
        ".weapon",
        ".named_colors",
        ".death_sequence",
        ".death_sequence_group",
        ".beam_effect",
        ".exhaust_trail_effect",
        ".particle_effect",
        ".shield_effect",
        ".font",
        ".gravity_well_props",
        ".button_style",
        ".drop_box_style",
        ".gui",
        ".label_style",
        ".list_box_style",
        ".reflect_box_style",
        ".scroll_bar_style",
        ".text_entry_box_style",
        ".brush",
        ".mesh_material",
        ".skybox",
        ".sound",
        ".texture_animation",
        ".gdpr_accept_data",
        ".playtime_message",
        ".welcome_message",
        ".start_mode",
    ]);

    /**
     * Indexes all relevant files in the given root path.
     * @param rootPath The root directory to index.
     */
    public async rebuildIndex(rootPath: string, lang: string): Promise<void> {
        this.entityManifestManager.clear();
        this.cacheManager.clear();
        this.fileIndex.clear();

        console.time(`Indexing::'${rootPath}'`);
        for (const extension of this.fileExtensions) {
            const files: string[] = await WorkspaceManager.findFiles(rootPath, extension);
            for (const file of files) {
                this.addToIndex(file);
            }
        }

        console.timeEnd(`Indexing::'${rootPath}'`);
        console.log(`Indexed ${this.fileIndex.size} unique IDs in '${rootPath}'.`);

        console.time(`Caching::'${rootPath}'`);
        await this.cacheManager.loadCache(rootPath, lang);
        await this.entityManifestManager.loadCache(rootPath);

        console.timeEnd(`Caching::'${rootPath}'`);
        console.log(`Cached ${this.cacheManager.size()} elements in '${rootPath}'.`);
    }

    /**
     * Adds a file to the index.
     * @param filePath The absolute path of the file to add.
     */
    private addToIndex(filePath: string): void {
        const fileName: string = path.basename(filePath);
        const identifier: string = fileName.split(".")[0];

        if (!this.fileIndex.has(identifier)) {
            this.fileIndex.set(identifier, []);
        }
        this.fileIndex.get(identifier)?.push(filePath);
    }

    /**
     * Retrieves the list of file paths associated with the given identifier.
     * @param identifier The identifier to look up.
     * @returns An array of file paths or undefined if the identifier is not found.
     */
    public getPaths(identifier: string): string[] | undefined {
        return this.fileIndex.get(identifier);
    }

    public getKeyFromPath(identifier: string): string | undefined {
        for (const [k, arr] of this.fileIndex) {
            if (arr.includes(identifier)) {
                return k;
            }
        }
    }
}
