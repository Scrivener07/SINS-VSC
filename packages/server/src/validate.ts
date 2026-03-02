import { Connection } from "vscode-languageserver";
import { ASTNode, Diagnostic, JSONDocument, LanguageService, MatchingSchema, PropertyASTNode, Range } from "vscode-json-languageservice";
import { TextDocument } from "vscode-languageserver-textdocument";
import { JsonAST } from "./json-ast";
import { DiagnosticManager } from "./providers";
import { Report } from "./providers/diagnostic";
import { PointerType } from "./pointers";
import { IEntityState, ILanguageState } from "./types";
import { GameData } from "./data3";

/**
 * Provides business logic for validation rules.
 */
export class Validator {
    constructor(
        private readonly connection: Connection,
        private readonly jsonLanguageService: LanguageService,
        private readonly diagnostics: Diagnostic[],
        private readonly diagnosticManager: DiagnosticManager,
        private readonly data: GameData,
        private readonly entity: IEntityState,
        private readonly language: ILanguageState
    ) {
        this.connection = connection;
        this.jsonLanguageService = jsonLanguageService;
        this.diagnostics = diagnostics;
        this.diagnosticManager = diagnosticManager;
        this.data = data;
        this.entity = entity;
        this.language = language;
    }

    /**
     * Core logic for validating a document.
     * @param textDocument The text document to validate.
     */
    public async validateTextDocument(textDocument: TextDocument): Promise<void> {
        const text: string = textDocument.getText();

        // TODO: Just logging the length for now.
        this.connection.console.info(`Validating ${textDocument.uri} (${text.length} characters in length.)`);

        // Parse the document as JSON.
        const jsonDocument: JSONDocument = this.jsonLanguageService.parseJSONDocument(textDocument);

        // Validate the document against the configured schemas.
        const diagnostics: Diagnostic[] = [
            ...(await this.jsonLanguageService.doValidation(textDocument, jsonDocument)),
            ...(await this.doValidation(textDocument, jsonDocument, this.entity.pointer))
        ];

        // Send the diagnostics to the client.
        this.connection.sendDiagnostics({
            uri: textDocument.uri,
            diagnostics
        });
    }

    private async doValidation(document: TextDocument, jsonDocument: JSONDocument, currentEntityType: PointerType): Promise<Diagnostic[]> {
        this.diagnostics.length = 0;
        const walk = (node: ASTNode | undefined, pointer: PointerType) => {
            if (!node || node.value === null) {
                return;
            }

            if (node.type === "array") {
                node.items.forEach((item) => walk(item, pointer));
                return;
            }

            const range: Range = {
                start: document.positionAt(node.offset),
                end: document.positionAt(node.offset + node.length)
            };

            const value: string = node.value as string;
            if (node.parent?.type === "property") {
                const key: string = node.parent.keyNode.value as string;
                this.validate(pointer, key, value, range, currentEntityType);
            }
        };

        const schemas: MatchingSchema[] = await this.jsonLanguageService.getMatchingSchemas(document, jsonDocument);
        schemas.forEach((schemaMatch) => {
            const props = schemaMatch.schema.properties;
            if (!props) {
                return;
            }

            Object.keys(props).forEach((key) => {
                const schemaProp: any = props[key];

                if (!("pointer" in schemaProp)) {
                    return;
                }

                const nodes: PropertyASTNode[] = JsonAST.findNodes(jsonDocument.root, key);
                nodes.forEach((node) => {
                    // prevent validation on properties with the same names that aren't in the same context
                    if (!JsonAST.isWithinSchemaNode(node.offset, schemaMatch.node)) {
                        return;
                    }
                    walk(node.valueNode, schemaProp.pointer);
                });
            });
        });

        return this.diagnostics;
    }

    private validate(pointer: PointerType, key: string, value: string, range: Range, currentEntity: PointerType): void {
        const pointer_string: string = PointerType[pointer];
        switch (pointer) {
            case PointerType.localized_text:
                if (currentEntity === PointerType.unit_skin && key === "description" && value === "") {
                    this.diagnosticManager.info("Empty localization key. Consider providing a description.", range);
                }
                // TODO: This only checks the user preferred language, should we check all languages for validation?
                // - Error: Localization key was not found in any files.
                // - Warn: Localization key was found in at at least one file, but not in others.
                else if (!this.data.localization.has(this.language.code, value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                }

                break;
            case PointerType.brush:
                // TODO: Figure out how to handle schemas with brush pointers that really refer to .png files.
                // if (!this.data.hasIdentifier(".brush", value)) {
                //     this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                // }

                if (!this.data.hasIdentifier(".png", value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                }

                break;
            case PointerType.unit_skin:
                // Check if it exists in the cache or the manifests, not being present in manifest is considered invalid.
                if (!this.data.hasIdentifier(".unit_skin", value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                } else if (!this.data.manifests.has("unit_skin", value)) {
                    this.diagnosticManager.warn(Report.missingInManifest(value, pointer_string), range);
                }
                break;
            case PointerType.mesh:
                if (!this.data.hasIdentifier(".mesh", value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                }
                break;
            case PointerType.weapon_tag:
                if (!this.data.uniforms.getEntry("weapon", value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                }
                break;
            case PointerType.unit:
                if (!this.data.hasIdentifier(".unit", value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                } else if (!this.data.manifests.has("unit", value)) {
                    this.diagnosticManager.warn(Report.missingInManifest(value, pointer_string), range);
                }
                break;
            case PointerType.weapon:
                if (!this.data.hasIdentifier(".weapon", value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                } else if (!this.data.manifests.has("weapon", value)) {
                    this.diagnosticManager.warn(Report.missingInManifest(value, pointer_string), range);
                }
                break;
            case PointerType.unit_item:
                if (!this.data.hasIdentifier(".unit_item", value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                } else if (!this.data.manifests.has("unit_item", value)) {
                    this.diagnosticManager.warn(Report.missingInManifest(value, pointer_string), range);
                }
                break;
        }
    }
}
