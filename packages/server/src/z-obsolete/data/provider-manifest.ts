import * as fs from "fs";
import { WorkspaceSearch } from "../../managers/workspace";
import { ValueStringSet } from "./types";
import { ProviderBase } from "./provider";

/**
 * @deprecated
 * Reads `.entity_manifest` files and extracts the `ids` array from each.
 * Each manifest type ("unit", "weapon") maps to a `Set<string>` of entity identifiers.
 */
export class ManifestProvider extends ProviderBase<ValueStringSet> {
    private static readonly FILE_EXTENSION: string = ".entity_manifest";

    private static readonly MANIFEST_TYPES: string[] = [
        "unit",
        "unit_skin",
        "unit_item",
        "weapon",
        "ability",
        "action_data_source",
        "buff",
        "exotic",
        "flight_pattern",
        "formation",
        "npc_reward",
        "player",
        "research_subject",
        "start_mode"
    ];

    constructor(identifier: string, name: string, priority: number, rootPath: string) {
        super(identifier, name, priority, rootPath);
    }

    public async load(): Promise<void> {
        this.cache.clear();

        for (const manifestType of ManifestProvider.MANIFEST_TYPES) {
            const files: string[] = await WorkspaceSearch.findFiles(this.rootPath, `${manifestType}${ManifestProvider.FILE_EXTENSION}`);

            if (files.length === 0) {
                continue;
            } else if (files.length > 1) {
                console.warn(`ManifestProvider: Multiple manifests found for '${manifestType}' in '${this.rootPath}'. Using first.`);
            }

            const filePath: string = files[0];
            try {
                const text: string = await fs.promises.readFile(filePath, "utf-8");
                const content: { ids?: string[] } = JSON.parse(text);
                const set: Set<string> = new Set<string>();

                if (content.ids) {
                    for (const id of content.ids) {
                        set.add(id);
                    }
                }

                this.cache.set(manifestType, { value: set, sourcePath: filePath });
            } catch (error) {
                console.error(`ManifestProvider: Failed to load manifest '${manifestType}' from '${filePath}'`, error);
            }
        }

        console.log(`ManifestProvider: Loaded ${this.cache.size} manifest types for '${this.identifier}'`);
    }
}
