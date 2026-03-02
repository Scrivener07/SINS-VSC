import * as path from "path";
import { CompletionParams, Connection, TextDocuments } from "vscode-languageserver/node";
import {
    ASTNode,
    CompletionItem,
    CompletionItemKind,
    CompletionList,
    JSONDocument,
    LanguageService,
    Range,
    TextDocument
} from "vscode-json-languageservice";
import { PointerType } from "../pointers";
import { JsonPointer } from "../json-pointer";
import { IEntityState, ILanguageState } from "../types";
import { GameData } from "../data";
import { fileURLToPath } from "url";

export class CompletionManager {
    /** The maximum amount of suggestions that will pop up before being cut. */
    private readonly MAX_SUGGESTIONS: number = 1000;

    private static readonly EMPTY_SET: Set<string> = new Set<string>();

    private readonly jsonLanguageService: LanguageService;
    private readonly documents: TextDocuments<TextDocument>;
    private readonly entity: IEntityState;
    private readonly data: GameData;

    private readonly language: ILanguageState;

    constructor(
        jsonLanguageService: LanguageService,
        documents: TextDocuments<TextDocument>,
        entity: IEntityState,
        data: GameData,
        language: ILanguageState
    ) {
        this.jsonLanguageService = jsonLanguageService;
        this.documents = documents;
        this.entity = entity;
        this.data = data;
        this.language = language;
    }

    /**
     * Registers the feature handler with the LSP connection.
     * @param connection The LSP connection to register the handler on.
     */
    public register(connection: Connection): void {
        connection.onCompletion(this.onCompletion.bind(this));
    }

    private async onCompletion(params: CompletionParams): Promise<CompletionList | null> {
        const document: TextDocument | undefined = this.documents.get(params.textDocument.uri);
        if (!document) {
            return null;
        }

        const jsonDocument: JSONDocument = this.jsonLanguageService.parseJSONDocument(document);
        const offset: number = document.offsetAt(params.position);
        const node: ASTNode | undefined = jsonDocument.getNodeFromOffset(offset);
        const context: PointerType = await JsonPointer.getContext(this.jsonLanguageService, document, jsonDocument, node);

        if (node) {
            let range: Range = {
                start: document.positionAt(node.offset + 1),
                end: document.positionAt(node.offset + node.length - 1)
            };
            const prefix: string = document.getText(range);

            return (
                this.doComplete(context, this.entity.pointer, prefix, range, document, offset) ??
                (await this.jsonLanguageService.doComplete(document, params.position, jsonDocument))
            );
        }
        return null;
    }

    private doComplete(
        context: PointerType,
        currentEntity: PointerType,
        prefix: string,
        range: Range,
        document: TextDocument,
        offset: number
    ): CompletionList | null {
        if (context === PointerType.localized_text) {
            // This is to suggest a PNG when user types `{icon:` within an inline localized text entry.
            if (currentEntity === PointerType.localized_text) {
                const cursorText: string = prefix.slice(0, offset - document.offsetAt(range.start));
                const match: RegExpExecArray | null = /{icon:(\w*)$/.exec(cursorText);

                if (match) {
                    const contents: string = match[1];
                    range = {
                        start: document.positionAt(offset - contents.length),
                        end: document.positionAt(offset)
                    };

                    // Provides {icon:XXX} inline token references for PNG texture identifiers.
                    return this.setCompletionList(this.getIdentifiers(".png"), CompletionItemKind.File, range, contents, (e) => ({
                        ...e,
                        detail: ".png"
                    }));
                }
                return null;
            }

            const keys: Set<string> = this.data.localization.getKeys(this.language.code) ?? CompletionManager.EMPTY_SET;
            return this.setCompletionList(keys, CompletionItemKind.Variable, range, prefix);
        } else if (context === PointerType.brush) {
            // TODO: Audit the process of checking for .png files and stripping the extension.
            // TODO: The cache is providing `*.brush` keys. I need to request `png` instead.
            const filepath = fileURLToPath(document.uri);
            const extension = path.extname(filepath);
            if (extension === ".unit_item" || extension === ".unit_skin") {
                return this.setCompletionList(this.getIdentifiers(".png"), CompletionItemKind.File, range, prefix, (e) => ({
                    ...e,
                    detail: ".png"
                }));
            } else {
                // return this.setBrushCompletionList(this.getIdentifiers(".brush"), range, prefix);
                return this.setCompletionList(this.getIdentifiers(".brush"), CompletionItemKind.File, range, prefix, (e) => ({
                    ...e,
                    detail: ".brush"
                }));
            }
        } else if (context === PointerType.unit_skin) {
            return this.setCompletionList(this.getIdentifiers(".unit_skin"), CompletionItemKind.Enum, range, prefix);
        } else if (context === PointerType.unit_item) {
            return this.setCompletionList(this.getIdentifiers(".unit_item"), CompletionItemKind.Enum, range, prefix);
        } else if (context === PointerType.unit) {
            return this.setCompletionList(this.getIdentifiers(".unit"), CompletionItemKind.Enum, range, prefix, (e) => ({
                ...e,
                detail: ".unit"
            }));
        } else if (context === PointerType.mesh) {
            return this.setCompletionList(this.getIdentifiers(".mesh"), CompletionItemKind.File, range, prefix, (e) => ({
                ...e,
                detail: ".obj"
            }));
        } else if (context === PointerType.weapon_tag) {
            const weapon_tags: Set<string> = this.data.uniforms.get("weapon") ?? CompletionManager.EMPTY_SET;
            return this.setCompletionList(weapon_tags, CompletionItemKind.Variable, range, prefix);
        } else if (context === PointerType.weapon) {
            return this.setCompletionList(this.getIdentifiers(".weapon"), CompletionItemKind.Variable, range, prefix, (e) => ({
                ...e,
                detail: ".weapon"
            }));
        } else if (context === PointerType.mesh_material) {
            return this.setCompletionList(this.getIdentifiers(".mesh_material"), CompletionItemKind.Variable, range, prefix, (e) => ({
                ...e,
                detail: ".mesh_material"
            }));
        } else if (context === PointerType.ttf) {
            return this.setCompletionList(this.getIdentifiers(".ttf"), CompletionItemKind.File, range, prefix, (e) => ({
                ...e,
                detail: ".ttf"
            }));
        }
        return null;
    }

    /**
     * Retrieves the set of identifiers for the given file extension from the data layer.
     * @param extension The file extension to retrieve identifiers for.
     * @returns The set of identifiers for the given file extension, or an empty set if the extension is not found.
     */
    private getIdentifiers(extension: string): Set<string> {
        return this.data.getIdentifiers(extension) ?? CompletionManager.EMPTY_SET;
    }

    private setCompletionList(
        cache: Set<string>,
        kind: CompletionItemKind,
        range: Range,
        prefix: string,
        optional?: (e: CompletionItem) => CompletionItem
    ): CompletionList {
        return {
            isIncomplete: false,
            items: Array.from(cache)
                .filter((e) => e.startsWith(prefix))
                .slice(0, this.MAX_SUGGESTIONS)
                .map((e) => {
                    const label: string = e.toLocaleLowerCase();
                    return {
                        label: label,
                        kind: kind,
                        textEdit: { range: range, newText: label }
                    };
                })
                .map((e) => optional?.(e) ?? e)
        };
    }

    // private setBrushCompletionList(cache: Set<string>, range: Range, prefix: string): CompletionList {
    //     const brushes: CompletionList = this.setCompletionList(cache, CompletionItemKind.File, range, prefix);
    //     return {
    //         ...brushes,
    //         items: brushes.items
    //             // .filter((e) => e.label.endsWith(".png"))
    //             .map((e) => {
    //                 const label: string = path.basename(e.label, path.extname(e.label));
    //                 return {
    //                     ...e,
    //                     label: label,
    //                     // detail: ".png",
    //                     detail: ".brush",
    //                     textEdit: {
    //                         range: range,
    //                         newText: label
    //                     }
    //                 };
    //             })
    //     };
    // }
}
