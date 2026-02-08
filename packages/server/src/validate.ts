import { ASTNode, Diagnostic, JSONDocument, LanguageService, PropertyASTNode, Range } from "vscode-json-languageservice";
import { TextDocument } from "vscode-languageserver-textdocument";
import { JsonAST } from "./json-ast";
import { DiagnosticManager } from "./providers";
import { Report } from "./providers/diagnostic";
import { PointerType } from "./pointers";
import { DataService, ManifestService, UniformService } from "./data/service-game";

export class Validator {
    constructor(
        private jsonLanguageService: LanguageService,
        private diagnostics: Diagnostic[],
        private diagnosticManager: DiagnosticManager,
        private dataManager: DataService,
        private manifestManager: ManifestService,
        private uniformManager: UniformService
    ) {
        this.jsonLanguageService = jsonLanguageService;
        this.diagnostics = diagnostics;
        this.dataManager = dataManager;
        this.manifestManager = manifestManager;
        this.uniformManager = uniformManager;
        this.diagnosticManager = diagnosticManager;
    }

    private validate(pointer: PointerType, key: string, value: string, range: Range, currentEntity: PointerType): void {
        const pointer_string: string = PointerType[pointer];
        switch (pointer) {
            case PointerType.localized_text:
                if (currentEntity === PointerType.unit_skin && key === "description" && value === "") {
                    this.diagnosticManager.info("Empty localization key. Consider providing a description.", range);
                } else if (!this.dataManager.root.get("localized_text")?.value.has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                }
                break;
            case PointerType.brush:
                if (!this.dataManager.root.get("brush")?.value.has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                }
                break;
            case PointerType.unit_skin:
                // check if it exists in the cache or the manifests, not being present in manifest is considered invalid.
                if (!this.dataManager.root.get("unit_skin")?.value.has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                } else if (!this.manifestManager.root.get("unit_skin")?.value.has(value)) {
                    this.diagnosticManager.warn(Report.missingInManifest(value, pointer_string), range);
                }
                break;
            case PointerType.mesh:
                if (!this.dataManager.root.get("mesh")?.value.has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                }
                break;
            case PointerType.weapon_tag:
                if (!this.uniformManager.root.get("weapon")?.value.has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                }
                break;
            case PointerType.unit:
                if (!this.dataManager.root.get("unit")?.value.has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                } else if (!this.manifestManager.root.get("unit")?.value.has(value)) {
                    this.diagnosticManager.warn(Report.missingInManifest(value, pointer_string), range);
                }
                break;
            case PointerType.weapon:
                if (!this.dataManager.root.get("weapon")?.value.has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                } else if (!this.manifestManager.root.get("weapon")?.value.has(value)) {
                    this.diagnosticManager.warn(Report.missingInManifest(value, pointer_string), range);
                }
                break;
            case PointerType.unit_item:
                if (!this.dataManager.root.get("unit_item")?.value.has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                } else if (!this.manifestManager.root.get("unit_item")?.value.has(value)) {
                    this.diagnosticManager.warn(Report.missingInManifest(value, pointer_string), range);
                }
                break;
        }
    }

    public async doValidation(document: TextDocument, jsonDocument: JSONDocument, currentEntityType: PointerType): Promise<Diagnostic[]> {
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

            const value = node.value as string;
            if (node.parent?.type === "property") {
                const key = node.parent.keyNode.value as string;
                this.validate(pointer, key, value, range, currentEntityType);
            }
        };

        const schemas = await this.jsonLanguageService.getMatchingSchemas(document, jsonDocument);
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

                const nodes = JsonAST.findNodes(jsonDocument.root, key);
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
}
