import { CacheStorage } from "./cache";
import { WorkspaceManager } from "./workspace";
import * as fs from "fs";

export interface UniformType {
    weapon: Set<string>;
    scenario: Set<string>;
}

export class UniformManager extends CacheStorage<UniformType> {
    public async loadUniformIds(rootPath: string, uniform: keyof UniformType): Promise<void> {
        const uniformFile: string[] = await WorkspaceManager.findFiles(rootPath, `${uniform}.uniforms`);
        const content: any = JSON.parse(await fs.promises.readFile(uniformFile[0], "utf-8"));
        const set: Set<string> = new Set();

        switch (uniform) {
            case "weapon":
                if (content?.weapon_tags) {
                    for (const tag of content?.weapon_tags) {
                        if (tag.name) {
                            set.add(tag.name);
                        }
                    }
                }
                break;
        }

        this.set(uniform, set);
    }

    public async loadWeaponTags(rootPath: string) {
        await this.loadUniformIds(rootPath, "weapon");
    }

    public async loadCache(rootPath: string): Promise<void> {
        await Promise.all([this.loadWeaponTags(rootPath)]);
    }
}
