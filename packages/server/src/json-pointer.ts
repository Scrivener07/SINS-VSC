import { ASTNode, JSONDocument, LanguageService } from "vscode-json-languageservice";
import { TextDocument } from "vscode-languageserver-textdocument";
import { JsonAST } from "./json-ast";
import { PointerType } from "./pointers";

export class JsonPointer {
    public static async getContext(
        jsonLanguageService: LanguageService,
        document: TextDocument,
        jsonDocument: JSONDocument,
        node: ASTNode | undefined
    ): Promise<PointerType> {
        if (!node || (node.parent?.type === "property" && node === node.parent.keyNode)) {
            return PointerType.none;
        }

        let currentNode: ASTNode | undefined = node;

        while (currentNode && currentNode.type !== "property") {
            currentNode = currentNode.parent;
        }

        if (!currentNode) {
            return PointerType.none;
        }

        const schemas = await jsonLanguageService.getMatchingSchemas(document, jsonDocument);

        for (const schema of schemas) {
            if (!JsonAST.isWithinSchemaNode(node.offset, schema.node)) {
                continue;
            }

            const { properties, patternProperties } = schema.schema;

            const key = currentNode.keyNode.value;
            const schemaProp: any = properties?.[key];

            if (schemaProp?.pointer) {
                return schemaProp.pointer as PointerType;
            }

            if (!patternProperties) {
                continue;
            }

            for (const pattern in patternProperties) {
                const match: any = patternProperties[pattern];
                if (match?.pointer) {
                    return match.pointer as PointerType;
                }
            }
        }
        return PointerType.none;
    }
}
