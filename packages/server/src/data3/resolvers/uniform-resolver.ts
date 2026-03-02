import * as fs from "fs";
import { LayeredRoot } from "../data-root";
import { FileEntry } from "../data-source";

// TODO: This should be further divided into specific uniform resolvers (WeaponUniformResolver, ResearchUniformResolver, etc.).
// The uniform types are different enough that they warrant separate handling and caching logic.

/* TODO: Add support for these uniform types:
- `C:\Program Files (x86)\Steam\steamapps\common\Sins2\uniforms\attack_target_type.uniforms` :: `target_filter → unit_types`
- `C:\Program Files (x86)\Steam\steamapps\common\Sins2\uniforms\unit_tag.uniforms`
*/

/**
 * Represents a weapon tag entry.
 */
export interface UniformEntry {
    /** The identifier name ("autocannon") */
    name: string;

    /** The localization key ("weapon_tag.autocannon") */
    localizedName?: string;
}

/**
 * Resolves uniform data (weapon tags, etc.) with content-level union merging.
 *
 * Uniforms are special: like localization files, multiple sources can contribute entries to the same uniform type.
 * The result is a union across all sources, with later sources overriding individual entries (last-wins per entry name).
 */
export class UniformResolver {
    private static readonly FILE_EXTENSION: string = ".uniforms";

    private readonly root: LayeredRoot;

    /** uniform type → name → UniformEntry (unioned across sources, last-wins per name) */
    private readonly cache = new Map<string, Map<string, UniformEntry>>();

    constructor(root: LayeredRoot) {
        this.root = root;
    }

    /**
     * Rebuild the uniform cache by scanning all sources for uniform files and merging their content.
     */
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
                    const json: any = JSON.parse(text);

                    if (!json) {
                        console.warn(`UniformResolver: No content in json uniform file ${entry.filePath}`);
                        continue;
                    }

                    let map: Map<string, UniformEntry> | undefined = this.cache.get(type);
                    if (!map) {
                        map = new Map();
                        this.cache.set(type, map);
                    }

                    // Each uniform type has a different structure.
                    // Extract entries based on the known type conventions.

                    if (type === "weapon" && Array.isArray(json.weapon_tags)) {
                        for (const tag of json.weapon_tags) {
                            if (typeof tag.name === "string" && typeof tag.localized_name === "string") {
                                const entry: UniformEntry = {
                                    name: tag.name,
                                    localizedName: tag.localized_name
                                };

                                map.set(entry.name, entry);
                            } else {
                                console.warn(`UniformResolver: Invalid weapon tag entry in ${entry.filePath}:`, tag);
                            }
                        }
                        continue;
                    }

                    // if (type === "research" && Array.isArray(json.tier_names)) {
                    //     for (const name of json.tier_names) {
                    //         if (typeof name === "string") {
                    //             const entry: UniformEntry = {
                    //                 name: name,
                    //                 localizedName: undefined // Research tier names don't have localization keys.
                    //             };
                    //             map.set(entry.name, entry);
                    //         } else {
                    //             console.warn(`UniformResolver: Invalid research tier name entry in ${entry.filePath}:`, name);
                    //         }
                    //     }
                    //     continue;
                    // }
                } catch (error) {
                    console.error(`UniformResolver: Failed to read uniform file ${entry.filePath}:`, error);
                }
            }
        }

        console.log(`UniformResolver: Loaded ${this.cache.size} uniform types.`);
    }

    //#region Query

    /**
     * Get just the set of names for a uniform type.
     * @param type The uniform type to get. (`weapon`, etc.)
     * @returns A set of names for the specified uniform type, or undefined if the type is not found.
     */
    public get(type: string): Set<string> | undefined {
        return this.getNames(type);
    }

    /**
     * Get the full entry for a uniform name.
     * @param type The uniform type (`weapon`, etc.)
     * @param name The uniform name to look up.
     * @returns The `UniformEntry` for the specified type and name, or undefined if not found.
     */
    public getEntry(type: string, name: string): UniformEntry | undefined {
        return this.cache.get(type)?.get(name);
    }

    /**
     * Get the set of names for a uniform type.
     * @param type The uniform type to get. (`weapon`, etc.)
     * @returns A set of names for the specified uniform type, or undefined if the type is not found.
     */
    public getNames(type: string): Set<string> | undefined {
        const map: Map<string, UniformEntry> | undefined = this.cache.get(type);
        if (!map) {
            return undefined;
        }
        return new Set(map.keys());
    }

    public has(type: string, identifier: string): boolean {
        return this.cache.get(type)?.has(identifier) ?? false;
    }

    //#endregion
}
