import * as path from "path";
import { WorkspaceSearch } from "../managers/workspace";
import { IDataProvider, KeyType, ValueString } from "./types";

export class TextureProvider implements IDataProvider<string> {
    public identifier: string;
    public name: string;
    public priority: number;

    private readonly rootPath: string;
    private readonly cache: Map<KeyType, ValueString> = new Map();
    private listeners: Array<() => void> = [];

    constructor(identifier: string, name: string, priority: number, rootPath: string) {
        this.identifier = identifier;
        this.name = name;
        this.priority = priority;
        this.rootPath = rootPath;
    }

    public async load(): Promise<void> {
        this.cache.clear();

        const files: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".png");
        for (const file of files) {
            try {
                const fileName: string = path.basename(file);
                const fileKey: string = fileName.split(".")[0];
                this.cache.set(fileKey, { value: file, sourcePath: file });
            } catch (error) {
                console.error(`Failed to load texture file: ${file}`, error);
            }
        }

        console.log(`Loaded ${this.cache.size} texture keys for provider '${this.identifier}'`);
    }

    public has(key: KeyType): boolean {
        return this.cache.has(key);
    }

    public get(key: KeyType): string | undefined {
        return this.cache.get(key)?.value;
    }

    public getAll(): Iterable<[KeyType, ValueString]> {
        return this.cache.entries();
    }

    public onDidChange(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((listened) => listened !== listener);
        };
    }

    /**
     * TODO: Call from file-watcher to trigger incremental rebuilds.
     */
    public notifyChanged(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}
