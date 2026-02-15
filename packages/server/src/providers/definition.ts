import * as fs from "fs";
import { pathToFileURL } from "url";
import { Location, Range } from "vscode-json-languageservice";
import { PointerType } from "../pointers";
import { DataService, IndexerService } from "../data/service-game";

export class DefinitionProvider {
    private indexer: IndexerService;
    private dataManager: DataService;
    private currentLanguage: string;

    constructor(dataManager: DataService, indexer: IndexerService, currentLanguage: string) {
        this.dataManager = dataManager;
        this.indexer = indexer;
        this.currentLanguage = currentLanguage;
    }

    public async goToDefinition(context: PointerType, identifier: string): Promise<Location[] | null> {
        let paths: string[] | undefined = this.indexer.index.get(identifier)?.value;
        let range: Range = Range.create({ character: 0, line: 0 }, { character: 0, line: 0 });
        if (context === PointerType.localized_text) {
            paths = this.indexer.index.get(this.currentLanguage)?.value;

            const localisation: Set<string> | undefined = this.dataManager.root.get("localized_text")?.value;
            if (!localisation) {
                return null;
            } else if (!localisation.has(identifier) || !paths) {
                return null;
            }

            const text: string = await fs.promises.readFile(paths[0], "utf-8");
            const lines: string[] = text.split("\n");
            for (let i = 0; i < lines.length; i++) {
                const idx: number = lines[i].indexOf(`"${identifier}"`);
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
