import * as fs from "fs";
import { WorkspaceSearch } from "../managers/workspace";
import { IDataProvider, KeyType, ValueSetString } from "./types";

/**
 * Reads `.entity_manifest` files and extracts the `ids` array from each.
 * Each manifest type ("unit", "weapon") maps to a `Set<string>` of entity identifiers.
 */
export class ManifestProvider implements IDataProvider<Set<string>> {
    public identifier: string;
    public name: string;
    public priority: number;

    private readonly rootPath: string;
    private readonly cache = new Map<KeyType, ValueSetString>();
    private listeners: Array<() => void> = [];

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
        this.identifier = identifier;
        this.name = name;
        this.priority = priority;
        this.rootPath = rootPath;
    }

    public async load(): Promise<void> {
        this.cache.clear();

        for (const manifestType of ManifestProvider.MANIFEST_TYPES) {
            const files: string[] = await WorkspaceSearch.findFiles(this.rootPath, `${manifestType}${ManifestProvider.FILE_EXTENSION}`);

            if (files.length === 0) {
                console.info(`ManifestProvider: No manifest found for '${manifestType}' in '${this.rootPath}'`);
                continue;
            } else if (files.length > 1) {
                console.warn(`ManifestProvider: Multiple manifests found for '${manifestType}' in '${this.rootPath}'. Using first.`);
            }

            try {
                const text: string = await fs.promises.readFile(files[0], "utf-8");
                const content: { ids?: string[] } = JSON.parse(text);
                const set: Set<string> = new Set<string>();

                if (content.ids) {
                    for (const id of content.ids) {
                        set.add(id);
                    }
                }

                this.cache.set(manifestType, { value: set, sourcePath: files[0] });
            } catch (error) {
                console.error(`ManifestProvider: Failed to load manifest '${manifestType}' from '${files[0]}'`, error);
            }
        }

        console.log(`ManifestProvider: Loaded ${this.cache.size} manifest types for '${this.identifier}'`);
    }

    public has(key: KeyType): boolean {
        return this.cache.has(key);
    }

    public get(key: KeyType): Set<string> | undefined {
        return this.cache.get(key)?.value;
    }

    public getAll(): Iterable<[KeyType, ValueSetString]> {
        return this.cache.entries();
    }

    public onDidChange(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((listened) => listened !== listener);
        };
    }

    public notifyChanged(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}
