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
export class LocalizationProvider implements IDataProvider<string> {
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

    public notifyChanged(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}

/**
 * A provider that loads `.localized_text` files from a root directory.
 *
 * Keys are composite: `"languageCode:localizationKey"` (`"en:trader_light_frigate_name"`).
 * Values are the localized strings.
 *
 * This flat structure lets it plug into `OrderedRoot<string>` with `ReplaceMerge`
 * so mod translations override base translations per key per language.
 */
class LocalizationFlatProvider implements IDataProvider<string> {
    public identifier: string;
    public name: string;
    public priority: number;

    private readonly rootPath: string;
    private readonly cache = new Map<KeyType, ValueString>();
    private listeners: Array<() => void> = [];

    /** Separator used between language code and localization key. */
    public static readonly KEY_SEPARATOR = ":";

    constructor(identifier: string, name: string, priority: number, rootPath: string) {
        this.identifier = identifier;
        this.name = name;
        this.priority = priority;
        this.rootPath = rootPath;
    }

    public async load(): Promise<void> {
        this.cache.clear();

        const files: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".localized_text");

        for (const file of files) {
            try {
                const fileName: string = path.basename(file);
                const languageCode: string = fileName.split(".")[0];

                const content: string = await fs.promises.readFile(file, "utf-8");
                const json: Record<string, unknown> = JSON.parse(content);

                let count: number = 0;
                for (const [localizationKey, value] of Object.entries(json)) {
                    if (typeof value === "string") {
                        const compositeKey: string = LocalizationFlatProvider.makeKey(languageCode, localizationKey);
                        const valueType: ValueString = { value, sourcePath: file };
                        this.cache.set(compositeKey, valueType);
                        count++;
                    }
                }

                console.log(`LocalizationProvider: Loaded ${count} keys for language '${languageCode}' from '${this.identifier}'`);
            } catch (error) {
                console.error(`LocalizationProvider: Failed to load localization file: ${file}`, error);
            }
        }

        console.log(`LocalizationProvider: Loaded ${this.cache.size} total keys for '${this.identifier}'`);
    }

    public get(key: KeyType): string | undefined {
        return this.cache.get(key)?.value;
    }

    public has(key: KeyType): boolean {
        return this.cache.has(key);
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

    /** Builds a composite key from language code and localization key. */
    public static makeKey(languageCode: string, localizationKey: string): KeyType {
        return `${languageCode}${LocalizationFlatProvider.KEY_SEPARATOR}${localizationKey}`;
    }

    /** Extracts the language code from a composite key. */
    public static getLanguageCode(compositeKey: KeyType): string {
        return compositeKey.substring(0, compositeKey.indexOf(LocalizationFlatProvider.KEY_SEPARATOR));
    }

    /** Extracts the localization key from a composite key. */
    public static getLocalizationKey(compositeKey: KeyType): string {
        return compositeKey.substring(compositeKey.indexOf(LocalizationFlatProvider.KEY_SEPARATOR) + 1);
    }
}
