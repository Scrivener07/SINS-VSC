import * as fs from "fs";
import * as path from "path";
import { WorkspaceSearch } from "../managers/workspace";
import { IDataProvider, KeyType, ValueString } from "./types";

/**
 * A provider that loads a single `.localized_text` file for one language from a root directory.
 *
 * Keys are plain localization keys (`"trader_light_frigate_name"`).
 * Values are the localized strings.
 */
export class LocalizationProvider implements IDataProvider<ValueString> {
    public identifier: string;
    public name: string;
    public priority: number;

    private readonly rootPath: string;
    private readonly languageCode: string;
    private readonly cache = new Map<KeyType, ValueString>();
    private listeners: Array<() => void> = [];

    constructor(identifier: string, name: string, priority: number, rootPath: string, languageCode: string) {
        this.identifier = identifier;
        this.name = name;
        this.priority = priority;
        this.rootPath = rootPath;
        this.languageCode = languageCode;
    }

    public async load(): Promise<void> {
        this.cache.clear();

        const files: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".localized_text");
        const targetFile: string | undefined = files.find((file) => {
            const fileName: string = path.basename(file);
            return fileName.split(".")[0] === this.languageCode;
        });

        if (!targetFile) {
            console.log(`LocalizationProvider: No '${this.languageCode}.localized_text' found in '${this.rootPath}'`);
            return;
        }

        try {
            const content: string = await fs.promises.readFile(targetFile, "utf-8");
            const json: Record<string, unknown> = JSON.parse(content);

            for (const [localizationKey, value] of Object.entries(json)) {
                if (typeof value === "string") {
                    this.cache.set(localizationKey, { value, sourcePath: targetFile });
                }
            }

            console.log(`LocalizationProvider: Loaded ${this.cache.size} keys for '${this.languageCode}' from '${this.identifier}'`);
        } catch (error) {
            console.error(`LocalizationProvider: Failed to load localization file: '${targetFile}'`, error);
        }
    }

    public has(key: KeyType): boolean {
        return this.cache.has(key);
    }

    public get(key: KeyType): ValueString | undefined {
        return this.cache.get(key);
    }

    // TODO: Add this to the provider interface?
    public getValue(key: KeyType): string | undefined {
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

    public notifyChanged(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}
