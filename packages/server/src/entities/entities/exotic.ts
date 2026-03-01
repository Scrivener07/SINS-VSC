import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";
import { SchemaBuilder as _ } from "../../schema-builder";

export class Exotic extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.exotic"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "exotic-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);
        this.getNodeMap(schema);
        this.setProperty("name", _.string(PointerType.localized_text));
        this.setProperty("description", _.string(PointerType.localized_text));
        this.setProperty("tooltip_icon", _.string(PointerType.brush));
        this.setProperty("small_icon", _.string(PointerType.brush));
        this.setProperty("large_icon", _.string(PointerType.brush));
        this.setProperty("picture", _.string(PointerType.brush));

        this.setSchema(schema);
        return this.config;
    }
}
