import * as fs from "fs";
import * as path from "path";
import { FileSearch } from "../../files";
import { ValueString } from "./types";
import { ProviderBase } from "./provider";

/**
 * @deprecated
 * A provider that loads a single `.localized_text` file for one language from a root directory.
 *
 * Keys are plain localization keys (`"trader_light_frigate_name"`).
 * Values are the localized strings.
 */
export class LocalizationProvider extends ProviderBase<ValueString> {
    private readonly languageCode: string;

    constructor(identifier: string, name: string, priority: number, rootPath: string, languageCode: string) {
        super(identifier, name, priority, rootPath);
        this.languageCode = languageCode;
    }

    public async load(): Promise<void> {
        this.cache.clear();

        const files: string[] = await FileSearch.findFiles(this.rootPath, ".localized_text");
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
}
