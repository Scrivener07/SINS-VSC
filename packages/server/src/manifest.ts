import * as fs from "fs";
import * as path from "path";
import { WorkspaceManager } from "./workspace";
import { CacheManager, CacheType } from "./cache";

export interface EntityManifest {
    weapon: Set<string>;
    unit_skin: Set<string>;
    unit_item: Set<string>;
    unit: Set<string>;
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

export class EntityManifestManager extends CacheManager {
    protected cache: Map<keyof CacheType, Set<string>> = new Map();

    public async loadEntityManifestIds(rootPath: string, entityManifest: keyof EntityManifest): Promise<void> {
        const manifest: string[] = await WorkspaceManager.findFiles(rootPath, `${entityManifest}.entity_manifest`);
        const content: any = JSON.parse(await fs.promises.readFile(manifest[0], "utf-8"));
        const set: Set<string> = new Set();
        if (content?.ids) {
            for (const id of content.ids) {
                set.add(id);
            }
        }
        this.set(entityManifest, set);
    }
    public async loadUnits(rootPath: string): Promise<void> {
        await this.loadEntityManifestIds(rootPath, "unit");
    }
    public async loadUnitSkins(rootPath: string): Promise<void> {
        await this.loadEntityManifestIds(rootPath, "unit_skin");
    }
    public async loadUnitItems(rootPath: string): Promise<void> {
        await this.loadEntityManifestIds(rootPath, "unit_item");
    }

    public async loadCache(rootPath: string): Promise<void> {
        await Promise.all([this.loadUnits(rootPath), this.loadUnitSkins(rootPath), this.loadUnitItems(rootPath)]);
    }
}
