import * as fs from "fs";
import { WorkspaceSearch } from "../managers/workspace";
import { IDataProvider, KeyType, ValueSetString } from "./types";

export type UniformType = {
    type: string;
    extractor: (content: any) => Iterable<string>;
};

/**
 * Reads `.uniforms` files and extracts named values (weapon tags).
 * Each uniform type maps to a `Set<string>` of names/tags.
 */
export class UniformProvider implements IDataProvider<ValueSetString> {
    public identifier: string;
    public name: string;
    public priority: number;

    private readonly rootPath: string;
    private readonly cache = new Map<KeyType, ValueSetString>();
    private listeners: Array<() => void> = [];

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
        this.identifier = identifier;
        this.name = name;
        this.priority = priority;
        this.rootPath = rootPath;
    }

    public async load(): Promise<void> {
        this.cache.clear();

        for (const { type, extractor } of UniformProvider.UNIFORM_TYPES) {
            const files: string[] = await WorkspaceSearch.findFiles(this.rootPath, `${type}.uniforms`);

            if (files.length === 0) {
                console.info(`UniformProvider: No uniform found for '${type}' in '${this.rootPath}'`);
                continue;
            }

            if (files.length > 1) {
                console.warn(`UniformProvider: Multiple uniforms found for '${type}' in '${this.rootPath}'. Using first.`);
            }

            try {
                const text: string = await fs.promises.readFile(files[0], "utf-8");
                const content: unknown = JSON.parse(text);
                const set: Set<string> = new Set<string>();

                for (const value of extractor(content)) {
                    set.add(value);
                }

                this.cache.set(type, { value: set, sourcePath: files[0] });
            } catch (error) {
                console.error(`UniformProvider: Failed to load uniform '${type}' from '${files[0]}'`, error);
            }
        }

        console.log(`UniformProvider: Loaded ${this.cache.size} uniform types for '${this.identifier}'`);
    }

    public has(key: KeyType): boolean {
        return this.cache.has(key);
    }

    public get(key: KeyType): ValueSetString | undefined {
        return this.cache.get(key);
    }

    // TODO: Add this to the provider interface?
    public getValue(key: KeyType): Set<string> | undefined {
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
