import * as fs from "fs";
import { LayeredRoot } from "../data-root";
import { FileEntry } from "../data-source";

export interface LocalizedEntry {
    readonly value: string;
    readonly sourcePath: string;
    readonly sourceDirectory: string;
}

/**
 * Handles content-level merging for localization files.
 *
 * Localization is special: multiple sources can contribute keys to the same
 * language file, with later sources overriding individual keys (not whole files).
 */
export class LocalizationResolver {
    private static readonly FILE_EXTENSION: string = ".localized_text";

    private readonly root: LayeredRoot;

    /** language → key → { value, sourcePath } */
    private readonly cache = new Map<string, Map<string, LocalizedEntry>>();

    constructor(root: LayeredRoot) {
        this.root = root;
    }

    /**
     * Rebuilds the localization cache by reading all `.localized_text` files
     * from all sources in priority order. Later sources override individual keys.
     */
    public async rebuild(): Promise<void> {
        this.cache.clear();

        // Iterate sources low→high priority so later sources override.
        for (const source of this.root.getSources()) {
            const bucket: Map<string, FileEntry> | undefined = source.getFilesByExtension(LocalizationResolver.FILE_EXTENSION);
            if (!bucket) {
                continue;
            }

            for (const [language, entry] of bucket) {
                let languageMap: Map<string, LocalizedEntry> | undefined = this.cache.get(language);
                if (!languageMap) {
                    languageMap = new Map();
                    this.cache.set(language, languageMap);
                }

                try {
                    const text: string = await fs.promises.readFile(entry.filePath, "utf-8");
                    const json: Record<string, unknown> = JSON.parse(text);

                    for (const [key, value] of Object.entries(json)) {
                        if (typeof value === "string") {
                            const localizedEntry: LocalizedEntry = {
                                value,
                                sourcePath: entry.filePath,
                                sourceDirectory: source.directory
                            };
                            languageMap.set(key, localizedEntry);
                        }
                    }
                } catch (error) {
                    console.error(`Failed to load localization file: ${entry.filePath}`, error);
                }
            }
        }

        console.log(`LocalizationResolver: Loaded ${this.cache.size} languages.`);
    }

    //#region Language

    /** Get a localized string for a language and key. */
    public get(language: string, key: string): string | undefined {
        return this.cache.get(language)?.get(key)?.value;
    }

    /** Checks if a localization key exists for a given language. */
    public has(language: string, key: string): boolean {
        return this.cache.get(language)?.has(key) ?? false;
    }

    /** Get the full entry with provenance. */
    public getEntry(language: string, key: string): LocalizedEntry | undefined {
        return this.cache.get(language)?.get(key);
    }

    /** Get all keys for a language. */
    public getKeys(language: string): Set<string> {
        const map: Map<string, LocalizedEntry> | undefined = this.cache.get(language);
        return map ? new Set(map.keys()) : new Set();
    }

    /** Get all layers for a localization key (for go-to-definition). */
    public async getLayers(language: string, key: string): Promise<LocalizedEntry[]> {
        const layers: LocalizedEntry[] = [];

        for (const source of this.root.getSources()) {
            const bucket: Map<string, FileEntry> | undefined = source.getFilesByExtension(LocalizationResolver.FILE_EXTENSION);
            if (!bucket) {
                continue;
            }

            const entry: FileEntry | undefined = bucket.get(language);
            if (!entry) {
                continue;
            }

            // TODO: This could be optimized by caching file contents during rebuild.
            try {
                const text: string = await fs.promises.readFile(entry.filePath, "utf-8");
                const json: Record<string, unknown> = JSON.parse(text);

                if (key in json && typeof json[key] === "string") {
                    const localizedEntry: LocalizedEntry = {
                        value: json[key] as string,
                        sourcePath: entry.filePath,
                        sourceDirectory: source.directory
                    };
                    layers.push(localizedEntry);
                }
            } catch (error) {
                console.error(`Failed to read localization for layers: ${entry.filePath}`, error);
            }
        }

        return layers;
    }

    //#endregion

    //#region Global

    /** Check if a key exists in any language. */
    public hasKey(key: string): boolean {
        for (const languageMap of this.cache.values()) {
            if (languageMap.has(key)) {
                return true;
            }
        }
        return false;
    }

    //#endregion
}
