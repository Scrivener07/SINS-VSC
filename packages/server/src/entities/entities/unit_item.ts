import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";

export class UnitItem extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.unit_item"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "unit-item-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        this.setSchema(schema);
        return this.config;
    }
}
