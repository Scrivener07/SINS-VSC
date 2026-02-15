import * as fs from "fs";
import { pathToFileURL } from "url";
import { Location, Position, Range } from "vscode-json-languageservice";
import { PointerType } from "../pointers";
import { DataService, IndexerService, LocalizationService } from "../data/service-game";
import { OrderedRoot } from "../data/root-ordered";
import { IResolution, ValueString } from "../data/types";

export class DefinitionProvider {
    private indexer: IndexerService;
    private dataManager: DataService;
    private localization: LocalizationService;
    private currentLanguage: string;

    constructor(indexer: IndexerService, dataManager: DataService, localization: LocalizationService, currentLanguage: string) {
        this.indexer = indexer;
        this.dataManager = dataManager;
        this.localization = localization;
        this.currentLanguage = currentLanguage;
    }

    public async goToDefinition(context: PointerType, identifier: string): Promise<Location[] | null> {
        // If it's a localization key, try to find the line number of the key in the file.
        if (context === PointerType.localized_text) {
            return await this.goToLocalization(identifier);
        }

        // For other contexts, use the indexer.
        //----------------------------------------

        // First, get a list of file paths from the indexer for the given identifier.
        const paths: string[] | undefined = this.indexer.index.get(identifier)?.value.value;

        // Default to pointing to the start of the file.
        const range: Range = Range.create({ character: 0, line: 0 }, { character: 0, line: 0 });

        // Prevent go-to-definition outside scope. ie: triggering a go to "en.localized_text" when the context is "weapon"
        if (paths && paths.length > 0 && paths.some((e) => e.endsWith("." + PointerType[context]))) {
            // TODO: Not all paths may be relevant for the definition.
            // Map all found paths to Locations.
            return paths.map((filePath) => {
                // Point to start of file since we dont have more specific info.
                const fileUrl: string = pathToFileURL(filePath).toString();
                const location: Location = Location.create(fileUrl, range);
                return location;
            });
        }

        return null;
    }

    private async goToLocalization(identifier: string): Promise<Location[] | null> {
        // Gets a set of all localization keys for the current language.
        const identifiers: Set<string> | undefined = this.dataManager.root.get("localized_text")?.value.value;

        // Check if this is a valid localization key.
        if (!identifiers?.has(identifier)) {
            return null;
        }

        // Get the localization root for the current language.
        const root: OrderedRoot<ValueString> | undefined = this.localization.get(this.currentLanguage);
        if (!root) {
            return null;
        }

        // Get all provider layers for the identifier. (base -> overrides)
        const layers: IResolution<ValueString>[] = root.getLayers(identifier);
        if (!layers || layers.length === 0) {
            return null;
        }

        console.info("DefinitionProvider: layers", layers);

        // Build locations for all layers.
        const locations: Location[] = [];

        // Process in reverse order (winner first, then base layers).
        for (let index = layers.length - 1; index >= 0; index--) {
            const layer: IResolution<ValueString> = layers[index];

            try {
                // Find the exact line and character position in the file.
                const range: Range | null = await this.findKeyInFile(layer.sourcePath, identifier);

                if (range) {
                    const fileUrl: string = pathToFileURL(layer.sourcePath).toString();
                    const location: Location = Location.create(fileUrl, range);
                    locations.push(location);
                } else {
                    console.warn(`DefinitionProvider: Key "${identifier}" not found in file ${layer.sourcePath}`);
                }
            } catch (error) {
                // Continue to next layer instead of failing entirely.
                console.error(`DefinitionProvider: Error reading file ${layer.sourcePath}:`, error);
            }
        }

        if (locations.length > 0) {
            return locations;
        } else {
            return null;
        }
    }

    /**
     * Finds the exact position of a localization key in a file.
     * @param filePath Path to the localization file
     * @param identifier The localization key to find
     * @returns Range of the key in the file, or null if not found
     */
    private async findKeyInFile(filePath: string, identifier: string): Promise<Range | null> {
        try {
            // Read and split the file into lines.
            const text: string = await fs.promises.readFile(filePath, "utf-8");
            const lines: string[] = text.split("\n");

            // Find the line number of the identifier.
            for (let index = 0; index < lines.length; index++) {
                const offset: number = lines[index].indexOf(`"${identifier}"`);
                if (offset !== -1) {
                    const start: Position = { line: index, character: offset };
                    const end: Position = { line: index, character: offset + identifier.length + 2 };
                    return Range.create(start, end);
                }
            }
        } catch (error) {
            console.error(`DefinitionProvider: Failed to read file ${filePath}:`, error);
        }

        return null;
    }
}
