import * as fs from "fs";
import { FileSearch } from "../../files";
import { ValueStringSet } from "./types";
import { ProviderBase } from "./provider";

/**
 * @deprecated
 */
export type UniformType = {
    type: string;
    extractor: (content: any) => Iterable<string>;
};

/**
 * @deprecated
 * Reads `.uniforms` files and extracts named values (weapon tags).
 * Each uniform type maps to a `Set<string>` of names/tags.
 */
export class UniformProvider extends ProviderBase<ValueStringSet> {
    private static readonly UNIFORM_TYPES: Array<UniformType> = [
        {
            type: "weapon",
            extractor: (content: any) => {
                const results: string[] = [];
                if (content?.weapon_tags) {
                    for (const tag of content.weapon_tags) {
                        if (tag.name) {
                            results.push(tag.name);
                        }
                    }
                }
                return results;
            }
        }
        // Add more uniform types here as needed ("scenario").
    ];

    constructor(identifier: string, name: string, priority: number, rootPath: string) {
        super(identifier, name, priority, rootPath);
    }

    public async load(): Promise<void> {
        this.cache.clear();

        for (const { type, extractor } of UniformProvider.UNIFORM_TYPES) {
            const files: string[] = await FileSearch.findFiles(this.rootPath, `${type}.uniforms`);

            if (files.length === 0) {
                continue;
            }

            if (files.length > 1) {
                console.warn(`UniformProvider: Multiple uniforms found for '${type}' in '${this.rootPath}'. Using first.`);
            }

            const filePath: string = files[0];
            try {
                const text: string = await fs.promises.readFile(filePath, "utf-8");
                const content: unknown = JSON.parse(text);
                const set: Set<string> = new Set<string>();

                for (const value of extractor(content)) {
                    set.add(value);
                }

                this.cache.set(type, { value: set, sourcePath: filePath });
            } catch (error) {
                console.error(`UniformProvider: Failed to load uniform '${type}' from '${filePath}'`, error);
            }
        }

        console.log(`UniformProvider: Loaded ${this.cache.size} uniform types for '${this.identifier}'`);
    }
}
