import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { SchemaBuilder as _, SchemaNode } from "../../schema-builder";
import { PointerType } from "../../pointers";

export class Buff extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.buff"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "buff-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);
        this.getNodeMap(schema);
        this.setProperty("mutation", _.string(PointerType.mutation));

        this.setSchema(schema);
        return this.config;
    }
}
