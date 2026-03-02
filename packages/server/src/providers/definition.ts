import * as fs from "fs";
import { pathToFileURL } from "url";
import { Connection, DefinitionParams, TextDocuments } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ASTNode, JSONDocument, LanguageService, Location, Position, Range } from "vscode-json-languageservice";
import { PointerType } from "../pointers";
import { JsonAST } from "../json-ast";
import { JsonPointer } from "../json-pointer";
import { ILanguageState } from "../types";
import { GameData, LocalizedEntry, ResolvedFile } from "../data3";

export class DefinitionProvider {
    private readonly jsonLanguageService: LanguageService;
    private readonly documents: TextDocuments<TextDocument>;
    private readonly data: GameData;
    private readonly language: ILanguageState;

    constructor(jsonLanguageService: LanguageService, documents: TextDocuments<TextDocument>, data: GameData, language: ILanguageState) {
        this.jsonLanguageService = jsonLanguageService;
        this.documents = documents;
        this.data = data;
        this.language = language;
    }

    /**
     * Registers the feature handler with the LSP connection.
     * @param connection The LSP connection to register the handler on.
     */
    public register(connection: Connection): void {
        connection.onDefinition(this.onDefinition.bind(this));
    }

    /**
     * Called when the user requests the definition of a symbol.
     * @param params The parameters for the definition request.
     * @returns A promise that resolves to an array of `Location` types or null.
     */
    private async onDefinition(params: DefinitionParams): Promise<Location[] | null> {
        // TODO: The textDocument.uri can be used to narrow the search space to a specific data source instead of searching everything.
        const document: TextDocument | undefined = this.documents.get(params.textDocument.uri);
        if (!document) {
            return null;
        }

        const jsonDocument: JSONDocument = this.jsonLanguageService.parseJSONDocument(document);
        const offset: number = document.offsetAt(params.position);
        const node: ASTNode | undefined = jsonDocument.getNodeFromOffset(offset);
        const context: PointerType = await JsonPointer.getContext(this.jsonLanguageService, document, jsonDocument, node);

        if (node && node.type === "string" && JsonAST.isNodeValue(node)) {
            return await this.goToDefinition(context, node.value);
        }

        return null;
    }

    private async goToDefinition(context: PointerType, identifier: string): Promise<Location[] | null> {
        if (context === PointerType.localized_text) {
            return await this.goToLocalization(identifier);
        } else {
            return await this.goToPointer(context, identifier);
        }
    }

    private async goToLocalization(identifier: string): Promise<Location[] | null> {
        // TODO: Use the document URI to narrow down the search to a specific data source instead of searching everything.

        // Resolve the localization entry for this key and language.
        const entry: LocalizedEntry | undefined = this.data.localization.getEntry(this.language.code, identifier);
        if (!entry) {
            console.error(`DefinitionProvider: No entry found for localization key "${identifier}" in language "${this.language.code}".`);
            return null;
        }

        try {
            // Find the exact line number and character position of the key in the file.
            const range: Range | null = await Localization.findKeyInFile(entry.sourcePath, identifier);
            if (range) {
                const fileUrl: string = pathToFileURL(entry.sourcePath).toString();
                const location: Location = Location.create(fileUrl, range);
                return [location];
            } else {
                console.warn(`DefinitionProvider: Key "${identifier}" not found in file ${entry.sourcePath}`);
                return null;
            }
        } catch (error) {
            console.error(`DefinitionProvider: Error reading file ${entry.sourcePath}:`, error);
            return null;
        }
    }

    private async goToPointer(context: PointerType, identifier: string): Promise<Location[] | null> {
        // TODO: Use the document URI to narrow down the search to a specific data source instead of searching everything.

        // Resolve the winning file for this identifier and extension.
        const extension: string = "." + PointerType[context];
        const resolved: ResolvedFile | undefined = this.data.context.root.resolveFile(extension, identifier);
        if (!resolved) {
            return null;
        }

        // Default to pointing at the start of the file since we dont have more specific info.
        const range: Range = Range.create({ character: 0, line: 0 }, { character: 0, line: 0 });
        const fileUrl: string = pathToFileURL(resolved.entry.filePath).toString();
        const location: Location = Location.create(fileUrl, range);
        return [location];
    }
}

/**
 * Utility class for finding the position of localization keys within localization files.
 */
class Localization {
    /**
     * Finds the exact position of a localization key in a file.
     * @param filePath Path to the localization file
     * @param identifier The localization key to find
     * @returns Range of the key in the file, or null if not found
     */
    public static async findKeyInFile(filePath: string, identifier: string): Promise<Range | null> {
        // TODO: This reads the entire file in one shot. For large localization files, this could be inefficient.
        //       Consider streaming or indexing line offsets for large files.
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
