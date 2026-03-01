import * as fs from "fs";
import { LayeredRoot } from "../data-root";
import { FileEntry } from "../data-source";

/**
 * Resolves uniform data (weapon tags, etc.) with content-level union merging.
 */
export class UniformResolver {
    private static readonly FILE_EXTENSION: string = ".uniforms";

    private readonly root: LayeredRoot;

    /** uniform type → Set<string> of values (unioned across sources) */
    private readonly cache = new Map<string, Set<string>>();

    constructor(root: LayeredRoot) {
        this.root = root;
    }

    public async rebuild(): Promise<void> {
        this.cache.clear();

        for (const source of this.root.getSources()) {
            const bucket: Map<string, FileEntry> | undefined = source.getFilesByExtension(UniformResolver.FILE_EXTENSION);
            if (!bucket) {
                continue;
            }

            for (const [type, entry] of bucket) {
                try {
                    const text: string = await fs.promises.readFile(entry.filePath, "utf-8");
                    const content: any = JSON.parse(text);

                    let set: Set<string> | undefined = this.cache.get(type);
                    if (!set) {
                        set = new Set();
                        this.cache.set(type, set);
                    }

                    // Extract based on uniform type.
                    if (type === "weapon" && content?.weapon_tags) {
                        for (const tag of content.weapon_tags) {
                            if (tag.name) {
                                set.add(tag.name);
                            }
                        }
                        continue;
                    }

                    if (type === "research" && content?.tier_names) {
                        for (const name of content.tier_names) {
                            set.add(name);
                        }
                        continue;
                    }
                } catch (error) {
                    console.error(`Failed to load uniform: ${entry.filePath}`, error);
                }
            }
        }

        console.log(`UniformResolver: Loaded ${this.cache.size} uniform types.`);
    }

    public get(type: string): Set<string> | undefined {
        return this.cache.get(type);
    }
}
