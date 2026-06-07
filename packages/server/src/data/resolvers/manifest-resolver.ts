import * as fs from "fs";
import { LayeredRoot } from "../data-root";
import { FileEntry } from "../data-source";

export interface ManifestEntry {
    readonly value: string;
    readonly sourcePath: string;
    readonly sourceDirectory: string;
}

export class ManifestResolver {
    private static readonly FILE_EXTENSION: string = ".entity_manifest";

    private readonly root: LayeredRoot;

    private readonly cache = new Map<string, Map<string, ManifestEntry>>();

    constructor(root: LayeredRoot) {
        this.root = root;
    }

    public async rebuild(): Promise<void> {
        this.cache.clear();

        for (const source of this.root) {
            const bucket: Map<string, FileEntry> | undefined = source.getFilesByExtension(ManifestResolver.FILE_EXTENSION);
            if (!bucket) {
                continue;
            }

            for (const [type, entry] of bucket) {
                try {
                    const text: string = await fs.promises.readFile(entry.filePath, "utf-8");
                    const content: { ids?: string[] } = JSON.parse(text);

                    // Get existing map or create new one — this enables union merging across sources.
                    let mapping: Map<string, ManifestEntry> = this.cache.get(type) ?? new Map<string, ManifestEntry>();

                    if (content.ids) {
                        for (const identifier of content.ids) {
                            const manifestEntry: ManifestEntry = {
                                value: identifier,
                                sourcePath: entry.filePath,
                                sourceDirectory: source.directory
                            };
                            mapping.set(identifier, manifestEntry);
                        }
                    }

                    this.cache.set(type, mapping);
                } catch (error) {
                    console.error(`ManifestResolver: Failed to load manifest '${entry.fileKey}' from '${entry.filePath}'`, error);
                }
            }
        }

        console.log(`ManifestResolver: Loaded ${this.cache.size} manifest types.`);
    }

    //#region Query

    public get(type: string): Map<string, ManifestEntry> | undefined {
        return this.cache.get(type);
    }

    public getEntry(type: string, name: string): ManifestEntry | undefined {
        return this.cache.get(type)?.get(name);
    }

    public getNames(type: string): Set<string> | undefined {
        const map: Map<string, ManifestEntry> | undefined = this.cache.get(type);
        if (!map) {
            return undefined;
        }
        return new Set(map.keys());
    }

    /** Checks if an identifier exists in the manifest for a given type. */
    public has(type: string, identifier: string): boolean {
        return this.cache.get(type)?.has(identifier) ?? false;
    }

    //#endregion
}
