import { ASTNode, Diagnostic, JSONDocument, LanguageService, PropertyASTNode, Range } from "vscode-json-languageservice";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CacheManager, EntityManifestManager, UniformManager } from "./managers";
import { JsonAST } from "./json-ast";
import { DiagnosticManager } from "./providers";
import { Report } from "./providers/diagnostic";
import { PointerType } from "./pointers";

export class Validator {
    constructor(
        private jsonLanguageService: LanguageService,
        private diagnostics: Diagnostic[],
        private cacheManager: CacheManager,
        private entityManifestManager: EntityManifestManager,
        private uniformManager: UniformManager,
        private diagnosticManager: DiagnosticManager
    ) {
        this.jsonLanguageService = jsonLanguageService;
        this.diagnostics = diagnostics;
        this.cacheManager = cacheManager;
        this.entityManifestManager = entityManifestManager;
        this.uniformManager = uniformManager;
        this.diagnosticManager = diagnosticManager;
    }

    private validate(pointer: PointerType, key: string, value: string, range: Range, currentEntity: PointerType): void {
        const pointer_string: string = PointerType[pointer];
        switch (pointer) {
            case PointerType.localized_text:
                if (currentEntity === PointerType.unit_skin && key === "description" && value === "") {
                    this.diagnosticManager.info("Empty localization key. Consider providing a description.", range);
                } else if (!this.cacheManager.get("localized_text").has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                }
                break;
            case PointerType.brush:
                if (!this.cacheManager.get("brush").has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                }
                break;
            case PointerType.unit_skin:
                // check if it exists in the cache or the manifests, not being present in manifest is considered invalid.
                if (!this.cacheManager.get("unit_skin").has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                } else if (!this.entityManifestManager.get("unit_skin").has(value)) {
                    this.diagnosticManager.warn(Report.missingInManifest(value, pointer_string), range);
                }
                break;
            case PointerType.mesh:
                if (!this.cacheManager.get("mesh").has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                }
                break;
            case PointerType.weapon_tag:
                if (!this.uniformManager.get("weapon").has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                }
                break;
            case PointerType.unit:
                if (!this.cacheManager.get("unit").has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                } else if (!this.entityManifestManager.get("unit").has(value)) {
                    this.diagnosticManager.warn(Report.missingInManifest(value, pointer_string), range);
                }
                break;
            case PointerType.weapon:
                if (!this.cacheManager.get("weapon").has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                } else if (!this.entityManifestManager.get("weapon").has(value)) {
                    this.diagnosticManager.warn(Report.missingInManifest(value, pointer_string), range);
                }
                break;
            case PointerType.unit_item:
                if (!this.cacheManager.get("unit_item").has(value)) {
                    this.diagnosticManager.error(Report.missingInFiles(value, pointer_string), range);
                } else if (!this.entityManifestManager.get("unit_item").has(value)) {
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
