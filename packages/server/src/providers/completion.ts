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
import { DataService, UniformService } from "../data/service-game";
import { JsonPointer } from "../json-pointer";
import { IEntityState } from "../types";

export class CompletionManager {
    /** The maximum amount of suggestions that will pop up before being cut. */
    private readonly MAX_SUGGESTIONS: number = 1000;

    private static readonly EMPTY_SET: Set<string> = new Set<string>();

    private readonly jsonLanguageService: LanguageService;
    private readonly documents: TextDocuments<TextDocument>;
    private readonly entity: IEntityState;
    private readonly data: DataService;
    private readonly uniforms: UniformService;

    constructor(
        jsonLanguageService: LanguageService,
        documents: TextDocuments<TextDocument>,
        entity: IEntityState,
        data: DataService,
        uniforms: UniformService
    ) {
        this.jsonLanguageService = jsonLanguageService;
        this.documents = documents;
        this.entity = entity;
        this.data = data;
        this.uniforms = uniforms;
    }

    /**
     * Registers the feature handler with the LSP connection.
     * @param connection The LSP connection to register the handler on.
     */
    public register(connection: Connection): void {
        connection.onCompletion(this.onCompletion.bind(this));
    }

    private async onCompletion(params: CompletionParams): Promise<CompletionList | null> {
        const document = this.documents.get(params.textDocument.uri);
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
            const prefix = document.getText(range);

            return (
                this.doComplete(context, this.entity.pointer, prefix, range, document, offset, this.data, this.uniforms) ??
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
        offset: number,
        dataManager: DataService,
        uniformManager: UniformService
    ): CompletionList | null {
        if (context === PointerType.localized_text) {
            if (currentEntity === PointerType.localized_text) {
                const cursorText = prefix.slice(0, offset - document.offsetAt(range.start));
                const match = /{icon:(\w*)$/.exec(cursorText);

                if (match) {
                    const contents = match[1];
                    range = {
                        start: document.positionAt(offset - contents.length),
                        end: document.positionAt(offset)
                    };
                    return this.setBrushCompletionList(this.getCache(dataManager, "brush"), range, contents);
                }
                return null;
            }
            return this.setCompletionList(this.getCache(dataManager, "localized_text"), CompletionItemKind.Variable, range, prefix);
        } else if (context === PointerType.brush) {
            return this.setBrushCompletionList(this.getCache(dataManager, "brush"), range, prefix);
        } else if (context === PointerType.unit_skin) {
            return this.setCompletionList(this.getCache(dataManager, "unit_skin"), CompletionItemKind.Enum, range, prefix);
        } else if (context === PointerType.unit_item) {
            return this.setCompletionList(this.getCache(dataManager, "unit_item"), CompletionItemKind.Enum, range, prefix);
        } else if (context === PointerType.unit) {
            return this.setCompletionList(this.getCache(dataManager, "unit"), CompletionItemKind.Enum, range, prefix, (e) => ({
                ...e,
                detail: ".unit"
            }));
        } else if (context === PointerType.mesh) {
            return this.setCompletionList(this.getCache(dataManager, "mesh"), CompletionItemKind.File, range, prefix, (e) => ({
                ...e,
                detail: ".obj"
            }));
        } else if (context === PointerType.weapon_tag) {
            return this.setCompletionList(this.getCache(uniformManager, "weapon"), CompletionItemKind.Variable, range, prefix);
        } else if (context === PointerType.weapon) {
            return this.setCompletionList(this.getCache(dataManager, "weapon"), CompletionItemKind.Variable, range, prefix, (e) => ({
                ...e,
                detail: ".weapon"
            }));
        } else if (context === PointerType.mesh_material) {
            return this.setCompletionList(this.getCache(dataManager, "mesh_material"), CompletionItemKind.Variable, range, prefix, (e) => ({
                ...e,
                detail: ".mesh_material"
            }));
        } else if (context === PointerType.ttf) {
            return this.setCompletionList(this.getCache(dataManager, "ttf"), CompletionItemKind.File, range, prefix, (e) => ({
                ...e,
                detail: ".ttf"
            }));
        }
        return null;
    }

    /**
     * Retrieves the set of identifiers for the given key from a service root.
     * Returns an empty set if the category is not found.
     */
    private getCache(service: DataService | UniformService, key: string): Set<string> {
        return service.root.get(key)?.item.value ?? CompletionManager.EMPTY_SET;
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

    private setBrushCompletionList(cache: Set<string>, range: Range, prefix: string): CompletionList {
        const brushes: CompletionList = this.setCompletionList(cache, CompletionItemKind.File, range, prefix);
        return {
            ...brushes,
            items: brushes.items
                .filter((e) => e.label.endsWith(".png"))
                .map((e) => {
                    const label: string = path.basename(e.label, path.extname(e.label));
                    return {
                        ...e,
                        label: label,
                        detail: ".png",
                        textEdit: {
                            range: range,
                            newText: label
                        }
                    };
                })
        };
    }
}
