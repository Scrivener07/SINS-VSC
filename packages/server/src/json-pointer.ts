import { TextDocument } from "vscode-languageserver-textdocument";
import { ASTNode, JSONDocument, LanguageService, MatchingSchema } from "vscode-json-languageservice";
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
            console.log(`JsonPointer::getContext node at offset ${node?.offset} is a property key, returning none.`);
            return PointerType.none;
        }

        let currentNode: ASTNode | undefined = node;

        while (currentNode && currentNode.type !== "property") {
            currentNode = currentNode.parent;
        }

        if (!currentNode) {
            console.log(`JsonPointer::getContext no property node found for node at offset ${node.offset}`);
            return PointerType.none;
        }

        const schemas: MatchingSchema[] = await jsonLanguageService.getMatchingSchemas(document, jsonDocument);

        for (const schema of schemas) {
            if (!JsonAST.isWithinSchemaNode(node.offset, schema.node)) {
                continue;
            }

            const { properties, patternProperties } = schema.schema;

            const key: string = currentNode.keyNode.value;
            const schemaProp: any = properties?.[key];

            if (schemaProp?.pointer) {
                JsonPointer.log_schema(key, schemaProp, schema);
                return schemaProp.pointer as PointerType;
            }

            if (!patternProperties) {
                continue;
            }

            for (const pattern in patternProperties) {
                const match: any = patternProperties[pattern];
                if (match?.pointer) {
                    JsonPointer.log_schema(key, schemaProp, schema);
                    return match.pointer as PointerType;
                }
            }
        }

        console.log(`JsonPointer::getContext no match found for node at offset ${node.offset}`);
        return PointerType.none;
    }

    private static log_schema(key: string, schemaProp: any, schema: any): void {
        const pointer_string: string = PointerType[schemaProp?.pointer] ?? "undefined";
        const schema_string: string = schema.schema.$id ?? "anonymous";
        console.log(`JsonPointer::getContext key="${key}", pointer="${pointer_string}", schema="${schema_string}"`);
    }
}
