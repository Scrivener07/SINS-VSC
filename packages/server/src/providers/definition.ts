import { pathToFileURL } from "url";
import { Location, Range } from "vscode-json-languageservice";
import { CacheManager, IndexManager } from "../managers";
import * as fs from "fs";
import { PointerType } from "../pointers";

export class DefinitionProvider {
    private indexManager: IndexManager;
    private cacheManager: CacheManager;
    private currentLanguage: string;

    constructor(cacheManager: CacheManager, indexManager: IndexManager, currentLanguage: string) {
        this.cacheManager = cacheManager;
        this.indexManager = indexManager;
        this.currentLanguage = currentLanguage;
    }
    public async goToDefinition(context: PointerType, identifier: string): Promise<Location[] | null> {
        let paths: string[] | undefined = this.indexManager.getPaths(identifier);
        let range: Range = Range.create({ character: 0, line: 0 }, { character: 0, line: 0 });
        if (context === PointerType.localized_text) {
            paths = this.indexManager.getPaths(this.currentLanguage);

            const localisation = this.cacheManager.get("localized_text");
            if (!localisation.has(identifier) || !paths) {
                return null;
            }

            const text = await fs.promises.readFile(paths[0], "utf-8");
            const lines = text.split("\n");
            for (let i = 0; i < lines.length; i++) {
                const idx = lines[i].indexOf(`"${identifier}"`);
                if (idx !== -1) {
                    range = Range.create(
                        { line: i, character: idx },
                        {
                            line: i,
                            character: idx + identifier.length + 2
                        }
                    );
                    break;
                }
            }
        }

        // prevent go-to-definition outside scope. ie: triggering a go to "en.localized_text" when the context is "weapon"
        if (paths && paths.length > 0 && paths.some((e) => e.endsWith("." + PointerType[context]))) {
            // Map all found paths to Locations.
            return paths.map((filePath) => {
                const location: Location = Location.create(
                    pathToFileURL(filePath).toString(),
                    range // Point to start of file
                );
                return location;
            });
        }

        return null;
    }
}
