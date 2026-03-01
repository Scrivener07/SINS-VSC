import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";
import { SchemaBuilder as _ } from "../../schema-builder";

export class Cursor extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.cursor"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "brush-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        const defs: any = schema.$defs;
        defs.brush_ptr = _.string(PointerType.brush);

        this.setSchema(schema);
        return this.config;
    }
}
