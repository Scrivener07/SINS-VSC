import * as fs from "fs";
import { CacheStorage } from "./cache";
import { FileSearch } from "../../files";

/**
 * @deprecated
 */
export interface UniformType {
    weapon: Set<string>;
    scenario: Set<string>;
}

/**
 * @deprecated
 */
export class UniformManager extends CacheStorage<UniformType> {
    public async load(rootPath: string): Promise<void> {
        await Promise.all([this.loadWeaponTags(rootPath)]);
    }

    private async store(rootPath: string, uniform: keyof UniformType): Promise<void> {
        const uniformFile: string[] = await FileSearch.findFiles(rootPath, `${uniform}.uniforms`);

        if (uniformFile.length === 0) {
            console.info(`No uniform found for '${uniform}' in '${rootPath}'.`);
            return;
        } else if (uniformFile.length > 1) {
            console.warn(`Multiple uniforms found for '${uniform}' in '${rootPath}'. Using the first one.`);
        }

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

    private async loadWeaponTags(rootPath: string): Promise<void> {
        await this.store(rootPath, "weapon");
    }
}
