import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";

export class NamedColors extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.named_colors"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath_dev, "named-colors-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        this.setSchema(schema);
        return this.config;
    }
}
