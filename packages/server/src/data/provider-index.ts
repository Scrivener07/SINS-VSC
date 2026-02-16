import * as path from "path";
import { WorkspaceSearch } from "../managers/workspace";
import { ValueStringArray } from "./types";
import { ProviderBase } from "./provider";

/**
 * A provider that indexes game data files by their identifier (filename without extension) and maps them to matching file paths.
 *
 * - The **key** is the identifier, which is the file name without extension.
 * - The **value** is an array of absolute file paths matching any given *key* identifier.
 *
 * An indentifying file name key may exist in multiple locations with different extensions.
 * For example, `advent_3` may exist as both a `advent_3.player_icon` and `advent_3.player_portrait` file.
 * In this case, the provider will store both file paths in the `value` array for that identifier key.
 *
 * The key `advent_3` maps to these values:
 * - `c:\\Sins2\\player_icons\\advent_3.player_icon`
 * - `c:\\Sins2\\player_portraits\\advent_3.player_portrait`
 *
 * Another example is localization files, which have a single `.localized_text` file per language.
 * The provider will index all localization keys from that file, and the value for each key will be the path to the same `.localized_text` file.
 *
 * The key for English `en` may have multiple `.localized_text` files from different sources, so the value will store all of those file paths.
 * - `c:\\Sins2\\localized_text\\en.localized_text`
 * - `c:\\MyMod1\\localized_text\\en.localized_text`
 * - `c:\\MyMod2\\localized_text\\en.localized_text`
 */
export class IndexProvider extends ProviderBase<ValueStringArray> {
    private static readonly FILE_EXTENSIONS: string[] = [
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
        ".start_mode"
    ];

    constructor(identifier: string, name: string, priority: number, rootPath: string) {
        super(identifier, name, priority, rootPath);
    }

    public async load(): Promise<void> {
        this.cache.clear();

        console.time(`IndexProvider::load '${this.identifier}'`);
        for (const extension of IndexProvider.FILE_EXTENSIONS) {
            const files: string[] = await WorkspaceSearch.findFiles(this.rootPath, extension);
            for (const filePath of files) {
                this.addToCache(filePath);
            }
        }

        console.timeEnd(`IndexProvider::load '${this.identifier}'`);
        console.log(`Indexed ${this.cache.size} unique IDs for provider '${this.identifier}'`);
    }

    private addToCache(filePath: string): void {
        const fileName: string = path.basename(filePath);
        let fileKey: string = fileName.split(".")[0];

        if (!fileKey) {
            if (fileName.toLowerCase() === ".mod_meta_data") {
                fileKey = ".mod_meta_data";
                console.info(`IndexProvider: Using special key for mod meta data file: '${filePath}'`);
            } else {
                console.warn(`IndexProvider: File is missing a key name: '${filePath}'`);
            }
        }

        const existing = this.cache.get(fileKey);
        if (existing) {
            // Append to the existing paths array for this identifier.
            existing.value.push(filePath);
        } else {
            const valueType: ValueStringArray = { value: [filePath], sourcePath: filePath };
            this.cache.set(fileKey, valueType);
        }
    }
}
