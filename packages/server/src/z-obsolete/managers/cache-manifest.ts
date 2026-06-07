import * as fs from "fs";
import { FileSearch } from "../../files";
import { CacheStorage } from "./cache";

/**
 * @deprecated
 * These types of entity have manifests available.
 */
export interface ManifestType {
    unit: Set<string>;
    unit_skin: Set<string>;
    unit_item: Set<string>;
    weapon: Set<string>;
    start_mode: Set<string>;
    research_subject: Set<string>;
    player: Set<string>;
    npc_reward: Set<string>;
    formation: Set<string>;
    flight_pattern: Set<string>;
    exotic: Set<string>;
    buff: Set<string>;
    action_data_source: Set<string>;
    ability: Set<string>;
}

/**
 * @deprecated
 * Indexes the lists of entity IDs from all manifest files for quick lookup.
 * All entity manifests have an array of strings in a property called `ids`.
 */
export class ManifestManager extends CacheStorage<ManifestType> {
    public async load(rootPath: string): Promise<void> {
        await Promise.all([
            await this.store(rootPath, "unit"),
            await this.store(rootPath, "unit_skin"),
            await this.store(rootPath, "unit_item"),
            await this.store(rootPath, "weapon"),
            await this.store(rootPath, "ability"),
            await this.store(rootPath, "action_data_source"),
            await this.store(rootPath, "buff"),
            await this.store(rootPath, "exotic"),
            await this.store(rootPath, "flight_pattern"),
            await this.store(rootPath, "formation"),
            await this.store(rootPath, "npc_reward"),
            await this.store(rootPath, "player"),
            await this.store(rootPath, "research_subject"),
            await this.store(rootPath, "start_mode")
        ]);
    }

    private async store(rootPath: string, entityManifest: keyof ManifestType): Promise<void> {
        const manifest: string[] = await FileSearch.findFiles(rootPath, `${entityManifest}.entity_manifest`);

        if (manifest.length === 0) {
            console.info(`No manifest found for '${entityManifest}' in '${rootPath}'.`);
            return;
        } else if (manifest.length > 1) {
            console.warn(`Multiple manifests found for '${entityManifest}' in '${rootPath}'. Using the first one.`);
        }

        const text: string = await fs.promises.readFile(manifest[0], "utf-8");
        const content: any = JSON.parse(text);
        const set: Set<string> = new Set();
        if (content?.ids) {
            for (const id of content.ids) {
                set.add(id);
            }
        }
        this.set(entityManifest, set);
    }
}
