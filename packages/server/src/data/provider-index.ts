import * as path from "path";
import { WorkspaceSearch } from "../managers/workspace";
import { IDataProvider, KeyType, ValueStringArray } from "./types";

/**
 * A provider that indexes game data files by identifier (filename without extension).
 * The value is the list of absolute file paths matching that identifier.
 */
export class IndexProvider implements IDataProvider<string[]> {
    public identifier: string;
    public name: string;
    public priority: number;

    private readonly rootPath: string;
    private readonly cache: Map<KeyType, { value: string[]; sourcePath: string }> = new Map();
    private listeners: Array<() => void> = [];

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
        this.identifier = identifier;
        this.name = name;
        this.priority = priority;
        this.rootPath = rootPath;
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

    public has(key: KeyType): boolean {
        return this.cache.has(key);
    }

    public get(key: KeyType): string[] | undefined {
        return this.cache.get(key)?.value;
    }

    public getAll(): Iterable<[KeyType, ValueStringArray]> {
        return this.cache.entries();
    }

    public onDidChange(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((listened) => listened !== listener);
        };
    }

    /**
     * TODO: Call from file-watcher to trigger incremental rebuilds.
     */
    public notifyChanged(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}
