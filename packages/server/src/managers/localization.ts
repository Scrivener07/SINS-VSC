import * as fs from "fs";
import * as path from "path";
import { WorkspaceManager } from "./workspace";

/**
 * Provides localization management for loading and retrieving localized text.
 */
export class LocalizationManager {
    /**
     * Maps language codes to their respective localization key-value pairs.
     *
     * Example:
     * `"en"` -> `{ "trader_light_frigate_name": "Cobalt Light Frigate" }`
     */
    private cache: Map<string, Map<string, string>> = new Map();

    /**
     * A set of all unique keys found across all languages.
     * Used to quickly check if a string is a localization key without iterating everything.
     */
    public knownKeys: Set<string> = new Set();

    /**
     * Scans the workspace for `.localized_text` files and loads them.
     */
    public async loadFromWorkspace(rootPath: string): Promise<void> {
        this.cache.clear();
        this.knownKeys.clear();

        const files: string[] = await WorkspaceManager.findFiles(rootPath, ".localized_text");

        for (const file of files) {
            try {
                const fileName: string = path.basename(file); // "en.localized_text"
                const languageCode: string = fileName.split(".")[0]; // "en"

                const content: string = await fs.promises.readFile(file, "utf-8");
                const json: any = JSON.parse(content);

                let languageMap: Map<string, string> | undefined = this.cache.get(languageCode);
                if (!languageMap) {
                    languageMap = new Map();
                    this.cache.set(languageCode, languageMap);
                }

                for (const [key, value] of Object.entries(json)) {
                    if (typeof value === "string") {
                        languageMap.set(key, value);
                        this.knownKeys.add(key);
                    }
                }
                console.log(`Loaded ${languageMap.size} keys for language '${languageCode}'`);
            } catch (error) {
                console.error(`Failed to load localization file: ${file}`, error);
            }
        }
    }
    public get(lang: string): Map<string, string> {
        return this.cache.get(lang)!;
    }
}
