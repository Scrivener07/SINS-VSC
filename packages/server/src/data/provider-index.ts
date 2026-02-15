import * as path from "path";
import { WorkspaceSearch } from "../managers/workspace";
import { ValueStringArray } from "./types";
import { ProviderBase } from "./provider";

/**
 * A provider that indexes game data files by identifier (filename without extension).
 * The value is the list of absolute file paths matching that identifier.
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
        const fileKey: string = fileName.split(".")[0];

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
