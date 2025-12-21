import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";

export class StartMode extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.start_mode"], uri: "" };
    public path: string[] = [this.schemaManager.unknown_schema];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        this.setSchema(schema);
        return this.config;
    }
}
